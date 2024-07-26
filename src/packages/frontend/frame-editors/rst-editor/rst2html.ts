/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Convert Rst file to hidden HTML file, which gets displayed in an iframe with
src pointed to this file (via raw server).
*/

import { exec, ExecOutput } from "../generic/client";
import { aux_file } from "@cocalc/util/misc";

export async function convert(
  project_id: string,
  path: string,
  time?: number
): Promise<ExecOutput> {
  return exec({
    command: "rst2html",
    args: [path, aux_file(path, "html")],
    project_id: project_id,
    err_on_exit: true,
    aggregate: time,
  });
}
