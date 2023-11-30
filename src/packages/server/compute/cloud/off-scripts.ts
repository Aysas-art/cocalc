import { defineSetStateFunction } from "./startup-script";
import { getServerSettings } from "@cocalc/database/settings/server-settings";

interface Options {
  compute_server_id: number;
  api_key: string;
}

export async function stopScript({ compute_server_id, api_key }: Options) {
  if (!api_key) {
    throw Error("api_key must be specified");
  }
  let { dns: apiServer } = await getServerSettings();
  if (!apiServer.includes("://")) {
    apiServer = `https://${apiServer}`;
  }

  return `
#!/bin/bash

set -v


${defineSetStateFunction({ api_key, apiServer, compute_server_id })}

setState state stopping

setState filesystem stop '' 30 50
docker stop filesystem
setState filesystem off '' 30 0

setState compute stop '' 30 50
docker stop compute
setState compute off '' 30 0

setState state off

`;
}

export async function deprovisionScript({
  compute_server_id,
  api_key,
}: Options) {
  if (!api_key) {
    throw Error("api_key must be specified");
  }
  let { dns: apiServer } = await getServerSettings();
  if (!apiServer.includes("://")) {
    apiServer = `https://${apiServer}`;
  }

  return `
#!/bin/bash

set -v


${defineSetStateFunction({ api_key, apiServer, compute_server_id })}

setState state stopping

setState filesystem stop '' 30 75
docker stop filesystem
setState filesystem off '' 30 50
docker rm filesystem
setState filesystem deleted '' 0 0

setState compute stop '' 30 75
docker stop compute
setState compute off '' 30 50
docker rm compute
setState compute deleted '' 0 0


setState state deprovisioned

`;
}
