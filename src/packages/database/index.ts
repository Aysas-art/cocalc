/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
PostgreSQL database entry point.
Do not import any of the submodules directly unless you
know exactly what you're doing.

COPYRIGHT : (c) 2021 SageMath, Inc.
*/

import { setupRecordConnectErrors } from "./postgres/record-connect-error";

const base = require("./postgres-base");

export const {
  pg_type,
  expire_time,
  one_result,
  all_results,
  count_result,
  PROJECT_COLUMNS,
  PUBLIC_PROJECT_COLUMNS,
} = base;

// Add further functionality to PostgreSQL class -- must be at the bottom of this file.
// Each of the following calls composes the PostgreSQL class with further important functionality.
// Order matters.

let theDB: any = undefined;
export function db(opts = {}) {
  if (theDB === undefined) {
    let PostgreSQL = base.PostgreSQL;

    for (const module of [
      "server-queries",
      "blobs",
      "synctable",
      "user-queries",
      "ops",
    ]) {
      PostgreSQL = require(`./postgres-${module}`).extend_PostgreSQL(
        PostgreSQL,
      );
    }
    theDB = new PostgreSQL(opts);
    setupRecordConnectErrors(theDB);
  }

  return theDB;
}

import getPool from "./pool";
export { getPool };
export { stripNullFields } from "./postgres/util";
