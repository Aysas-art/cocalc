import getPool from "../../pool";
import getLogger from "@cocalc/backend/logger";
import type { RetentionModel } from "@cocalc/util/db-schema";
import activeUsers from "./active-users";
import retainedUsers from "./retained-users";

const log = getLogger("database:retention");

type Period =
  | { seconds: number }
  | { hours: number }
  | { days: number }
  | { months: number }
  | { years: number };

interface Options {
  start: Date;
  stop: Date;
  model: RetentionModel;
  period: Period;
}

export async function updateRetentionData({
  start,
  stop,
  model,
  period,
}: Options) {
  if (start == null || stop == null || model == null || period == null) {
    log.debug("some input is null so nothing to do");
    // nothing to do
    return;
  }
  if (typeof start == "object" && start["="]) {
    start = start["="];
  }
  if (typeof stop == "object" && stop["="]) {
    stop = stop["="];
  }
  if (typeof model == "object" && model["="]) {
    model = model["="];
  }
  if (typeof period == "object" && period["="]) {
    period = period["="];
  }
  const pool = getPool();
  const current = await pool.query(
    "SELECT last_start_time, NOW() - $4::interval - $4::interval AS required_last_start_time FROM crm_retention WHERE start=$1 AND stop=$2 AND model=$3 AND period=$4",
    [start, stop, model, period]
  );
  log.debug(current);

  if (
    current.rows.length > 0 &&
    current.rows[0].last_start_time >= current.rows[0].required_last_start_time
  ) {
    log.debug("have the data, so nothing to do");
    // nothing to do.
    return;
  }
  log.debug("need to compute data", JSON.stringify(current.rows?.[0]));

  // We do a check to make sure the interval is not too short to avoid a massive
  // computation.  This could easily happen, e.g., when playing around in the crm.
  const { rows } = await pool.query(
    "SELECT extract(epoch FROM $1::interval) AS seconds",
    [period]
  );
  if (rows[0].seconds < 3600) {
    throw Error("period must be at least one hour long");
    // TODO: stronger constraint involving start?
  }
  const last_start_time = current.rows[0]?.last_start_time;

  const [table, isActiveUsers] = model.split(":");

  if (isActiveUsers) {
    await activeUsers({
      table,
      model,
      last_start_time,
      pool,
      start,
      stop,
      period,
    });
  } else {
    await retainedUsers({
      table,
      model,
      last_start_time,
      pool,
      start,
      stop,
      period,
    });
  }
}
