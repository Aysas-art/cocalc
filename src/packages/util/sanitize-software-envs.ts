/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { ComputeImage } from "@cocalc/util/compute-images";
import { isEmpty, pick } from "lodash";

// This sanitization routine checks if the "software environment" information
// is correct, or sets some defaults, etc.
// It's used by the frontend in customize.tsx and the backend in server/software-envs.ts

export type Purpose = "server" | "webapp";

const WEBAPP_RELEVANT = [
  "tag",
  "title",
  "registry",
  "descr",
  "order",
  "short",
  "group",
  "hidden",
] as const;

export interface SoftwareEnvConfig {
  default: string;
  groups: string[];
  environments: { [key: string]: ComputeImage };
}

/**
 * Check that the "software environment" object is valid, set defaults, default exists, etc.
 *
 * If there is a problem, it logs it to the given logger and returns "null".
 *
 * purpose: "server" returns all values, while "webapp" only filters those, which are relevant for the webapp (and does not expose extra information)
 */
export function sanitizeSoftwareEnv(
  { software, registry }: { software: any; registry?: string },
  L: (...msg) => void,
  purpose: Purpose
): SoftwareEnvConfig | null {
  const envs = software["environments"] as { [key: string]: ComputeImage };

  if (isEmpty(envs)) {
    L(`No software environments defined`);
    return null;
  }

  // make sure this is an array of strings
  const groups: string[] = (software["groups"] ?? []).map((x) => `${x}`);

  for (const key of Object.keys(envs)) {
    // if purpose is "webapp", only pick these entries in the env object: title, registry, tag, descr, order, short, group

    const env =
      purpose === "webapp" ? pick(envs[key], WEBAPP_RELEVANT) : envs[key];
    envs[key] = { ...env, id: key };

    // if no registry is set, we're only using the id/key and the data
    // if the registry is set (in particular for on-prem) we use registry:tag to set the image
    if (registry != null) {
      if (typeof env["tag"] !== "string") {
        L(`WARNING: Environment ${key} has no "tag" field -- ignoring`);
        delete envs[key];
        continue;
      }
      env["registry"] = fallback(env["registry"], registry);
    }

    const group = fallback(env["group"], "General");
    env["group"] = group;
    env["title"] = fallback(env["title"], env["tag"], key);
    env["descr"] = fallback(env["descr"], "");
    env["order"] = typeof env["order"] === "number" ? env["order"] : 0;
    if (!!env["hidden"]) {
      env["hidden"] = true;
    } else {
      delete env["hidden"];
    }

    // if group is not in groups, add it
    if (!groups.includes(group)) {
      groups.push(group);
    }
  }

  // test that there is at leat one environemnt left in envs
  if (isEmpty(envs)) {
    L(`No software environments left after sanitization`);
    return null;
  }

  const swDflt = software["default"];
  // we check that the default is a string and that it exists in envs
  const dflt =
    typeof swDflt === "string" && envs[swDflt] != null
      ? swDflt
      : Object.keys(envs)[0];

  return { groups, default: dflt, environments: envs };
}

function fallback(a: any, b: any, c?: string): any {
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return c;
}
