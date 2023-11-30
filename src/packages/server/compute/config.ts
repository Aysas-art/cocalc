import { CLOUDS_BY_NAME, Cloud } from "@cocalc/util/db-schema/compute-servers";
import { getServerSettings } from "@cocalc/database/settings/server-settings";

export async function computeServersEnabled(): Promise<boolean> {
  const settings = await getServerSettings();
  if (!settings.compute_servers_enabled) {
    return false;
  }
  for (const cloud in CLOUDS_BY_NAME) {
    if (settings[`compute_servers_${cloud}_enabled`]) {
      return true;
    }
  }
  return false;
}

export async function availableClouds(): Promise<Cloud[]> {
  const settings = await getServerSettings();
  const v: Cloud[] = [];

  for (const cloud in CLOUDS_BY_NAME) {
    if (settings[`compute_servers_${cloud}_enabled`]) {
      v.push(CLOUDS_BY_NAME[cloud].name);
    }
  }
  return v;
}
