import { redux } from "@cocalc/frontend/app-framework";
import { CLOUDS_BY_NAME, Cloud } from "@cocalc/util/db-schema/compute-servers";

// Returns True if in admin compute_servers_enabled is true *and* at least
// one cloud is also enabled, since otherwise compute servers are not in any
// way useful.
export function computeServersEnabled() {
  const customize = redux.getStore("customize");
  if (customize == null) {
    return false;
  }
  if (!customize.get("compute_servers_enabled")) {
    return false;
  }
  for (const cloud in CLOUDS_BY_NAME) {
    if (customize.get(`compute_servers_${cloud}_enabled`)) {
      return true;
    }
  }
  return false;
}

export function availableClouds(): Cloud[] {
  const v: Cloud[] = [];
  const customize = redux.getStore("customize");
  if (customize == null) {
    return v;
  }
  for (const cloud in CLOUDS_BY_NAME) {
    if (customize.get(`compute_servers_${cloud}_enabled`)) {
      v.push(CLOUDS_BY_NAME[cloud].name);
    }
  }
  return v;
}
