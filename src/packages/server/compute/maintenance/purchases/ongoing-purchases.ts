/*
This function checks for any servers with long running purchases and
sets the update_purchase flag for them in the database, so that
the manage-purchases loop can handle them soon.

Here are the criterion for when we need to do some management of a compute server's purchases:

- it has any open purchase that started at least MAX_PURCHASE_LENGTH_MS ago.
- it has a network purchase that wasn't updated since MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS ago.

*/

import getPool from "@cocalc/database/pool";
import getLogger from "@cocalc/backend/logger";
import {
  MAX_PURCHASE_LENGTH_MS,
  MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS,
  PERIODIC_UPDATE_INTERVAL_MS,
} from "./manage-purchases";

const logger = getLogger("server:compute:maintain-purchases");

export default async function ongoingPurchases() {
  logger.debug("maintainActivePurchases");
  const pool = getPool();

  // be sure to update servers with open purchases past MAX_PURCHASE_LENGTH_MS
  await pool.query(`
  UPDATE compute_servers
  SET update_purchase=TRUE
  WHERE id IN (
    SELECT (description->>'compute_server_id')::integer
    FROM purchases
    WHERE cost IS NULL
    AND (service='compute-server' OR service='compute-server-network-usage')
    AND period_start <= NOW() - interval '${
      MAX_PURCHASE_LENGTH_MS / 1000
    } seconds'
  )
`);

  // update ALL running servers that haven't been updated since MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS,
  // because there might be network activity.  These could in theory not have a network purchase,
  // in which case it should get created.
  await pool.query(`
  UPDATE compute_servers
  SET update_purchase=TRUE
  WHERE state='running' AND COALESCE(last_purchase_update, '1970-01-01') <= NOW() - interval '${
    MAX_NETWORK_USAGE_UPDATE_INTERVAL_MS / 1000
  } seconds'`);

  // update ALL non-deprovisiond servers that we haven't updated since PERIODIC_UPDATE_INTERVAL_MS
  await pool.query(`
  UPDATE compute_servers
  SET update_purchase=TRUE
  WHERE state!='deprovisioned' AND COALESCE(last_purchase_update, '1970-01-01') <= NOW() - interval '${
    PERIODIC_UPDATE_INTERVAL_MS / 1000
  } seconds'`);
}
