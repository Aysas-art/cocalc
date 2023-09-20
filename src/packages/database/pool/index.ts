/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import getPool from "./pool";
export default getPool;
export * from "./pool";
export type { Client, PoolClient, Pool } from "pg";
export type { CacheTime } from "./cached";

export { timeInSeconds } from "./util";
