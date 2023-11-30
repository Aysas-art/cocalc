/*
Where Data is Stored:

We centralize here determination of all directories on the filesystem
where data is stored for any of the components of CoCalc, run in any way.

All information here must be determinable when this module is initialized,
e.g., from environment variables or heuristics involving the filesystem.
In particular, nothing here can be impacted by command line flags
or content of a database.
*/

const DEFINITION = `CoCalc Environment Variables:
- root -- if COCALC_ROOT is set then it; otherwise use [cocalc-source]/src/.
- data -- if the environment variable DATA is set, use that.  Otherwise, use {root}/data
- pgdata -- if env var PGDATA is set, use that; otherwise, it is {data}/postgres: where data data is stored (if running locally)
- pghost - if env var PGHOST is set, use that; otherwise, it is {data}/postgres/socket: what database connects to
- projects -- If env var PROJECTS is set, use that; otherwise, it is {data}"/projects/[project_id]";
              This is where project home directories are (or shared files for share server), and it MUST
              contain the string "[project_id]".
- secrets -- if env var SECRETS is set, use that; otherwise, it is {data}/secrets:  where to store secrets
- logs -- if env var LOGS is set, use that; otherwise, {data}/logs:  directory in which to store logs
`;

import { join, resolve } from "path";

function determineRootFromPath(): string {
  const cur = __dirname;
  const search = "/src/";
  const i = cur.lastIndexOf(search);
  const root = resolve(cur.slice(0, i + search.length - 1));
  process.env.COCALC_ROOT = root;
  return root;
}

export const root: string = process.env.COCALC_ROOT ?? determineRootFromPath();
export const data: string = process.env.DATA ?? join(root, "data");
export const pguser: string = process.env.PGUSER ?? "smc";
export const pgdata: string = process.env.PGDATA ?? join(data, "postgres");
export const pghost: string = process.env.PGHOST ?? join(pgdata, "socket");
export const pgdatabase: string =
  process.env.SMC_DB ?? process.env.PGDATABASE ?? "smc";
export const projects: string =
  process.env.PROJECTS ?? join(data, "projects", "[project_id]");
export const secrets: string = process.env.SECRETS ?? join(data, "secrets");
export const logs: string = process.env.LOGS ?? join(data, "logs");
export const blobstore: "disk" | "sqlite" =
  (process.env.COCALC_JUPYTER_BLOBSTORE_IMPL as any) ?? "sqlite";

export let apiKey: string = process.env.API_KEY ?? "";
export let apiServer: string = process.env.API_SERVER ?? "";

// Delete API_KEY from environment to reduce chances of it leaking, e.g., to
// spawned terminal subprocess.
// Important note: It's critical that only one version of the @cocalc/backend
// package is being used, or some parts of the code will get the API_KEY and
// others will not.
delete process.env.API_KEY;

export function setApi({ key, server }: { key?: string; server?: string }) {
  if (key != null) {
    apiKey = key;
  }
  if (server != null) {
    checkApiServer(server);
    apiServer = server;
  }
}

function sanityChecks() {
  // Do a sanity check on projects:
  if (!projects.includes("[project_id]")) {
    throw Error(
      `${DEFINITION}\n\nenv variable PROJECTS must contain "[project_id]" but it is "${process.env.PROJECTS}"`,
    );
  }
  if ((blobstore as any) != "sqlite" && (blobstore as any) != "disk") {
    throw Error(
      "If set, COCALC_JUPYTER_BLOBSTORE_IMPL must be 'sqlite' or 'disk'",
    );
  }
  checkApiServer(apiServer);
}

function checkApiServer(server) {
  if (!server) return;
  if (server.endsWith("/")) {
    throw Error("API_SERVER must not end in /");
  }
  if (!server.startsWith("http://") && !server.startsWith("https://")) {
    throw Error("API_SERVER must start with http:// or https://");
  }
}

sanityChecks();
