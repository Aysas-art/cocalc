/*
Create a compute server and returns the numerical id of that server.

This just makes a record in a database.  It doesn't check anything in any remote api's
are start anything running.  That's handled elsewhere.

It's of course easy to make a compute serve that can't be started due to invalid parameters.
*/

import getPool from "@cocalc/database/pool";
import { isValidUUID } from "@cocalc/util/misc";
import isCollaborator from "@cocalc/server/projects/is-collaborator";

import type { Cloud, GPU, CPU } from "@cocalc/util/db-schema/compute-servers";

interface Options {
  account_id: string;
  project_id: string;
  name?: string;
  color?: string;
  idle_timeout?: number;
  autorestart?: boolean;
  cloud?: Cloud;
  gpu?: GPU;
  gpu_count?: number;
  cpu?: CPU;
  core_count?: number;
  memory?: number;
  spot?: boolean;
}

const FIELDS =
  "project_id,name,account_id,color,idle_timeout,autorestart,cloud,gpu,gpu_count,cpu,core_count,memory,spot".split(
    ",",
  );

export default async function createServer(opts: Options): Promise<number> {
  if (!isValidUUID(opts.account_id)) {
    throw Error("created_by must be a valid uuid");
  }
  if (!isValidUUID(opts.project_id)) {
    throw Error("project_id must be a valid uuid");
  }
  if (!(await isCollaborator(opts))) {
    throw Error("user must be a collaborator on project");
  }

  const fields: string[] = [];
  const params: any[] = [];
  const dollars: string[] = [];
  for (const field of FIELDS) {
    if (opts[field] != null) {
      fields.push(field);
      params.push(opts[field]);
      dollars.push(`$${fields.length}`);
    }
  }

  const query = `INSERT INTO compute_servers(${fields.join(
    ",",
  )}) VALUES(${dollars.join(",")}) RETURNING id`;
  const pool = getPool();
  const { rows } = await pool.query(query, params);
  const { id } = rows[0];
  return id;
}
