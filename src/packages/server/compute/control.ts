/*
Start, stop, etc. a particular compute server, generically, for any cloud...

How this works will start simple, but is obviously going to get very complicated
over time, with multiple clouds, heuristics, api client code, etc.

Console testing:

cd packages/server
DEBUG=cocalc:* DEBUG_CONSOLE=yes node

a = require('./dist/compute/control')

// you have to look up an account_id to use this:
await a.start({account_id:'fd9d855b-9245-473d-91a0-cdd1e69410e4', id:8})

*/

import { getServer, getServerNoCheck } from "./get-servers";
import { setState, setError } from "./util";
import * as testCloud from "./cloud/testcloud";
import * as fluidStack from "./cloud/fluid-stack";
import * as coreWeave from "./cloud/core-weave";
import * as lambdaCloud from "./cloud/lambda-cloud";
import * as googleCloud from "./cloud/google-cloud";
import type {
  Architecture,
  Cloud,
  ComputeServer,
  Configuration,
  ImageName,
  State,
} from "@cocalc/util/db-schema/compute-servers";
import { getTargetState } from "@cocalc/util/db-schema/compute-servers";
import { STATE_INFO } from "@cocalc/util/db-schema/compute-servers";
import { delay } from "awaiting";
import { reuseInFlight } from "async-await-utils/hof";
import { setProjectApiKey, deleteProjectApiKey } from "./project-api-key";
import getPool from "@cocalc/database/pool";
import { isEqual } from "lodash";
import updatePurchase from "./update-purchase";
import { changedKeys } from "@cocalc/server/compute/util";
import { checkValidDomain } from "@cocalc/util/compute/dns";
import { hasDNS, makeDnsChange } from "./dns";
import startupScript from "@cocalc/server/compute/cloud/startup-script";
import {
  stopScript,
  deprovisionScript,
} from "@cocalc/server/compute/cloud/off-scripts";
import setDetailedState from "@cocalc/server/compute/set-detailed-state";

import getLogger from "@cocalc/backend/logger";

const logger = getLogger("server:compute:control");

//const MIN_STATE_UPDATE_INTERVAL_MS = 10 * 1000;

async function runTasks(opts, f: () => Promise<void>) {
  try {
    await f();
    await waitStableNoError(opts);
  } catch (err) {
    await setError(opts.id, `${err}`);
  } finally {
    // We always update the state no matter what after doing the above.
    // This ensures things stay in sync with the server, and
    // also DNS gets updated when the state function is called.
    await state(opts);
  }
}

export const start: (opts: {
  account_id: string;
  id: number;
}) => Promise<void> = reuseInFlight(async ({ account_id, id }) => {
  let server = await getServer({ account_id, id });
  try {
    await setError(id, "");
    await setProjectApiKey({ account_id, server });
  } catch (err) {
    await setError(id, `${err}`);
    throw err;
  }
  runTasks({ account_id, id }, async () => {
    await setState(id, "starting");
    await doStart(server);
    await setState(id, "running");
    await saveProvisionedConfiguration(server);
    await setDetailedState({
      project_id: server.project_id,
      id,
      name: "vm",
      state: "booting",
      timeout: 60,
      progress: 10,
    });
  });
});

async function doStart(server: ComputeServer) {
  switch (server.cloud) {
    case "test":
      return await testCloud.start(server);
    case "core-weave":
      return await coreWeave.start(server);
    case "fluid-stack":
      return await fluidStack.start(server);
    case "google-cloud":
      return await googleCloud.start(server);
    case "lambda-cloud":
      return await lambdaCloud.start(server);
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

async function saveProvisionedConfiguration({
  configuration,
  id,
}: ComputeServer) {
  const pool = getPool();
  await pool.query(
    "UPDATE compute_servers SET provisioned_configuration=$1 WHERE id=$2",
    [configuration, id],
  );
}

export const stop: (opts: { account_id: string; id: number }) => Promise<void> =
  reuseInFlight(async ({ account_id, id }) => {
    const server = await getServer({ account_id, id });
    await setError(id, "");
    runTasks({ account_id, id }, async () => {
      await setState(id, "stopping");
      await deleteProjectApiKey({ account_id, server });
      await doStop(server);
      await setState(id, "off");
    });
  });

async function doStop(server: ComputeServer) {
  switch (server.cloud) {
    case "test":
      return await testCloud.stop(server);
    case "core-weave":
      return await coreWeave.stop(server);
    case "fluid-stack":
      return await fluidStack.stop(server);
    case "google-cloud":
      return await googleCloud.stop(server);
    case "lambda-cloud":
      return await lambdaCloud.stop(server);
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

export const deprovision: (opts: {
  account_id: string;
  id: number;
}) => Promise<void> = reuseInFlight(async ({ account_id, id }) => {
  const server = await getServer({ account_id, id });
  await setError(id, "");

  runTasks({ account_id, id }, async () => {
    await setState(id, "stopping");
    await deleteProjectApiKey({ account_id, server });
    await doDeprovision(server);
    await setState(id, "deprovisioned");
  });
});

async function doDeprovision(server: ComputeServer) {
  switch (server.cloud) {
    case "google-cloud":
      return await googleCloud.deprovision(server);
    case "test":
      // just a no-op
      return;
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

//const lastCalled: { [id: number]: { time: number; state: State } } = {};

export const state: (opts: {
  account_id: string;
  id: number;
}) => Promise<State> = reuseInFlight(async ({ account_id, id }) => {
  //const now = Date.now();
  //   const last = lastCalled[id];
  //   if (now - last?.time < MIN_STATE_UPDATE_INTERVAL_MS) {
  //     return last.state;
  //   }
  const server = await getServer({ account_id, id });
  const state = await getCloudServerState(server);
  doPurchaseUpdate({ server, state });
  if (state == "deprovisioned") {
    // don't need it anymore.
    await deleteProjectApiKey({ account_id, server });
  }
  //lastCalled[id] = { time: now, state };
  return state;
});

async function getCloudServerState(server: ComputeServer): Promise<State> {
  try {
    const state = await doState(server);
    await setState(server.id, state);
    return state;
  } catch (err) {
    await setError(server.id, `${err}`);
    await setState(server.id, "unknown");
    return "unknown";
  }
}

async function doState(server: ComputeServer): Promise<State> {
  switch (server.cloud) {
    case "test":
      return await testCloud.state(server);
    case "core-weave":
      return await coreWeave.state(server);
    case "fluid-stack":
      return await fluidStack.state(server);
    case "google-cloud":
      return await googleCloud.state(server);
    case "lambda-cloud":
      return await lambdaCloud.state(server);
    case "onprem":
      // for onprem all state is self-reported.
      return server.state ?? "unknown";
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

async function waitStableNoError({ account_id, id }) {
  for (let i = 0; i < 2; i++) {
    // wait a little for stop to not be running before querying
    await delay(3000);
    try {
      await waitForStableState({ account_id, id, maxTime: 10 * 60 * 1000 });
      return;
    } catch (err) {
      await setError(id, `error waiting for stable state -- ${err}`);
    }
  }
}

export const waitForStableState = reuseInFlight(
  async ({
    account_id,
    id,
    maxTime = 1000 * 60 * 5,
  }: {
    account_id: string;
    id: number;
    maxTime?: number; // max time in ms
  }) => {
    let s0 = Date.now();
    const server = await getServer({ account_id, id });
    const { startDelay, maxDelay, backoff } = backoffParams(server.cloud);
    let interval = startDelay;

    while (Date.now() - s0 < maxTime) {
      const state = await getCloudServerState(server);
      if (STATE_INFO[state]?.stable) {
        doPurchaseUpdate({ server, state });
        return state;
      }
      await delay(interval);
      interval = Math.min(interval * backoff, maxDelay);
    }
    throw Error("timeout waiting for stable state");
  },
  { createKey: (args) => `${args[0].id}` },
);

// Different clouds may have different policies about how
// frequently we should ping them for machine state information.
const BACKOFF_PARAMS = {
  default: {
    startDelay: 5000,
    maxDelay: 10000,
    backoff: 1.3,
  },
  test: {
    startDelay: 10,
    maxDelay: 150,
    backoff: 1.3,
  },
};

function backoffParams(cloud: Cloud): {
  startDelay: number;
  maxDelay: number;
  backoff: number;
} {
  return BACKOFF_PARAMS[cloud] ?? BACKOFF_PARAMS["default"];
}

// Computes and returns the upstream cost we incur in usd per hour for
// this compute server.  This is the fixed cost, not including network costs.
export async function cost({
  account_id,
  id,
  state,
}: {
  account_id: string;
  id: number;
  state: State;
}): Promise<number> {
  const server = await getServer({ account_id, id });
  const cost_per_hour = await computeCost({ server, state });
  // since we know the cost, let's save it so it is display
  // to user, etc.
  await getPool().query(
    "UPDATE compute_servers SET cost_per_hour=$1 WHERE id=$2",
    [cost_per_hour, id],
  );
  return cost_per_hour;
}

export async function computeCost({
  server,
  state,
}: {
  server: ComputeServer;
  state: State;
}) {
  if (state == "deprovisioned") {
    // in all cases this one is by definition easy
    return 0;
  }
  // for unstable states, we use the cost of the target stable state, because that's
  // what we get charged.  This emans the cloud cost functions below only have to handle
  // cost for stable states.
  state = getTargetState(state);

  switch (server.cloud) {
    case "test":
      return await testCloud.cost(server, state);
    case "core-weave":
      return await coreWeave.cost(server, state);
    case "fluid-stack":
      return await fluidStack.cost(server, state);
    case "google-cloud":
      return await googleCloud.cost(server, state);
    case "lambda-cloud":
      return await lambdaCloud.cost(server, state);
    default:
      throw Error(
        `cost for cloud '${server.cloud}' and state '${state}' not currently supported`,
      );
  }
}

/* Suspend and Resume */
export const suspend: (opts: {
  account_id: string;
  id: number;
}) => Promise<void> = reuseInFlight(async ({ account_id, id }) => {
  const server = await getServer({ account_id, id });
  await setError(id, "");
  runTasks({ account_id, id }, async () => {
    await setState(id, "suspending");
    await doSuspend(server);
    await setState(id, "suspended");
  });
});

async function doSuspend(server: ComputeServer) {
  switch (server.cloud) {
    case "google-cloud":
      return await googleCloud.suspend(server);
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

export const resume: (opts: {
  account_id: string;
  id: number;
}) => Promise<void> = reuseInFlight(async ({ account_id, id }) => {
  let server = await getServer({ account_id, id });
  await setError(id, "");

  runTasks({ account_id, id }, async () => {
    await setState(id, "starting");
    await doResume(server);
    await setState(id, "running");
  });
});

async function doResume(server: ComputeServer) {
  switch (server.cloud) {
    case "google-cloud":
      return await googleCloud.resume(server);
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

export const reboot: (opts: {
  account_id: string;
  id: number;
}) => Promise<void> = reuseInFlight(async ({ account_id, id }) => {
  let server = await getServer({ account_id, id });
  runTasks({ account_id, id }, async () => {
    await setError(id, "");
    await setState(id, "stopping");
    await doReboot(server);
    await setState(id, "starting");
  });
});

async function doReboot(server: ComputeServer) {
  switch (server.cloud) {
    case "google-cloud":
      return await googleCloud.reboot(server);
    default:
      throw Error(`cloud '${server.cloud}' not currently supported`);
  }
}

// Throws an exception if changing from the given current
// configuration to the new one should not be allowed.
export async function validateConfigurationChange({
  cloud,
  state,
  currentConfiguration,
  changes,
}: {
  state: State;
  cloud: Cloud;
  currentConfiguration: Configuration;
  changes: Partial<Configuration>;
}) {
  const newConfiguration = { ...currentConfiguration, ...changes };
  if (newConfiguration.cloud != cloud) {
    throw Error(
      `configuration cloud "${newConfiguration.cloud}" must match compute server cloud "${cloud}"`,
    );
  }
  if (isEqual(currentConfiguration, newConfiguration)) {
    return;
  }

  const changed = changedKeys(currentConfiguration, newConfiguration);
  if (changed.has("dns")) {
    if (newConfiguration.dns) {
      // throws an error if domain isn't valid:
      checkValidDomain(newConfiguration.dns);
    }
    // changing dns is allowed in all states
    changed.delete("dns");
  }
  if (changed.size == 0) {
    // nothing to validate
    return;
  }

  if (changed.has("authToken")) {
    if (state == "running" || state == "suspended" || state == "suspending") {
      throw Error("cannot change authToken while server is running");
    }
    if (typeof newConfiguration.authToken != "string") {
      throw Error("authToken must be a string");
    }
  }

  if (changed.has("excludeFromSync")) {
    if (state == "running" || state == "suspended" || state == "suspending") {
      throw Error("cannot change excludeFromSync while server is running");
    }
    if (newConfiguration.excludeFromSync != null) {
      if (typeof newConfiguration.excludeFromSync != "object") {
        throw Error("excludeFromSync must be an array");
      }
      for (const path of newConfiguration.excludeFromSync) {
        if (typeof path != "string") {
          throw Error("excludeFromSync must be an array of strings");
        }
        if (!path) {
          throw Error("path must not be trivial");
        }
        if (path.includes("/")) {
          throw Error("directories must not include '/'");
        }
        if (path.includes("|")) {
          throw Error("directories may not include '|'");
        }
      }
    }
  }

  switch (cloud) {
    case "google-cloud":
      await googleCloud.validateConfigurationChange({
        state,
        // @ts-ignore
        currentConfiguration,
        // @ts-ignore
        newConfiguration,
      });
      return;
  }
}

export async function makeConfigurationChange({
  id,
  cloud,
  state,
  currentConfiguration,
  changes,
}: {
  id: number;
  state: State;
  cloud: Cloud;
  currentConfiguration: Configuration;
  changes: Partial<Configuration>;
}) {
  if (state == "deprovisioned") {
    return;
  }

  const newConfiguration = { ...currentConfiguration, ...changes };
  if (isEqual(currentConfiguration, newConfiguration)) {
    return;
  }

  const changed = changedKeys(currentConfiguration, newConfiguration);
  if (changed.has("dns")) {
    if (state == "running" || !newConfiguration.dns) {
      // if running or removing dns, better update it.
      if (await hasDNS()) {
        // .. but only if DNS is actually configured and enabled (otherwise, there is nothing that we can do, and
        // the frontend client is not honoring our published config, or config is incomplete).
        // TODO: maybe we should just throw an error in this case?
        await makeDnsChange({
          id,
          previousName: currentConfiguration.dns,
          name: newConfiguration.dns,
          cloud: newConfiguration.cloud,
        });
      }
    }
    changed.delete("dns");
  }
  if (changed.size == 0) {
    // nothing else to change
    return;
  }

  switch (cloud) {
    case "google-cloud":
      return await googleCloud.makeConfigurationChange({
        id,
        state,
        // @ts-ignore
        currentConfiguration,
        // @ts-ignore
        newConfiguration,
      });
    default:
      throw Error(
        `makeConfigurationChange not implemented for cloud '${cloud}'`,
      );
  }
}

async function doPurchaseUpdate({ server, state }) {
  try {
    await updatePurchase({ server, newState: state });
  } catch (err) {
    logger.debug(
      "error updating purchase in response to a state change -- ",
      `${err}`,
      { server_id: server.id },
    );
  }
}

export async function getNetworkUsage(opts: {
  server: ComputeServer;
  start: Date;
  end: Date;
}): Promise<{ amount: number; cost: number }> {
  switch (opts.server.cloud) {
    case "google-cloud":
      return await googleCloud.getNetworkUsage(opts);
    case "lambda-cloud":
      // lambda doesn't charge for network usage at all.
      return { amount: 0, cost: 0 };
    case "onprem":
      // TODO: network usage currently free for on prem. This will change
      // since we should charge for data transfer out from the project to the on prem node!
      return { amount: 0, cost: 0 };
    case "test":
      return testNetworkUsage[opts.server.id] ?? { amount: 0, cost: 0 };
    default:
      throw Error(
        `cloud '${opts.server.cloud}' network usage not currently implemented`,
      );
  }
}

export function hasNetworkUsage(cloud: Cloud): boolean {
  return cloud == "google-cloud" || cloud == "test";
}

// Used for unit testing only.
const testNetworkUsage: { [id: number]: { amount: number; cost: number } } = {};
export async function setTestNetworkUsage({
  id,
  amount,
  cost,
}: {
  id: number;
  amount: number;
  cost: number;
}) {
  testNetworkUsage[id] = { amount, cost };
}

async function getStartupParams(id: number): Promise<{
  project_id: string;
  gpu?: boolean;
  arch: Architecture;
  image: ImageName;
  exclude_from_sync: string;
  auth_token: string;
}> {
  const server = await getServerNoCheck(id);
  const excludeFromSync = server.configuration?.excludeFromSync ?? [];
  const auth_token = server.configuration?.authToken ?? "";
  const exclude_from_sync = excludeFromSync.join("|");
  switch (server.cloud) {
    case "google-cloud":
      return {
        ...(await googleCloud.getStartupParams(server)),
        exclude_from_sync,
        auth_token,
      };
    case "onprem":
      const { configuration } = server;
      if (configuration.cloud != "onprem") {
        throw Error("inconsistent configuration -- must be onprem");
      }
      return {
        project_id: server.project_id,
        gpu: !!configuration.gpu,
        arch: configuration.arch ?? "x86_64",
        image: configuration.image ?? "python",
        exclude_from_sync,
        auth_token,
      };
    default:
      throw Error(
        `getStartupParams for '${server.cloud}' not currently implemented`,
      );
  }
}

export async function getHostname(id: number): Promise<string> {
  // we might make this more customizable
  return `compute-server-${id}`;
}

export async function getStartupScript({
  id,
  api_key,
  installUser,
}: {
  id;
  api_key;
  installUser?;
}): Promise<string> {
  const params = await getStartupParams(id);
  return await startupScript({
    compute_server_id: id,
    api_key,
    hostname: await getHostname(id),
    installUser,
    ...params,
  });
}

export async function getStopScript({
  id,
  api_key,
}: {
  id;
  api_key;
}): Promise<string> {
  return await stopScript({
    compute_server_id: id,
    api_key,
  });
}

export async function getDeprovisionScript({
  id,
  api_key,
}: {
  id;
  api_key;
}): Promise<string> {
  return await deprovisionScript({
    compute_server_id: id,
    api_key,
  });
}
