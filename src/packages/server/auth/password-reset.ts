/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { v4 } from "uuid";
import getPool from "@cocalc/database/pool";
import { expireTime } from "@cocalc/database/pool/util";

// Returns number of "recent" attempts to reset the password with this
// email from this ip address. By "recent" we mean, "in the last 10 minutes".
export async function recentAttempts(
  email_address: string,
  ip_address: string
): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT COUNT(*)::INT FROM password_reset_attempts WHERE email_address=$1 AND ip_address=$2 AND time >= NOW() - INTERVAL '10 min'",
    [email_address, ip_address]
  );
  return rows[0].count;
}

export async function createReset(
  email_address: string,
  ip_address: string,
  ttl_s: number
): Promise<string> {
  const pool = getPool();

  // Record that there was an attempt:
  if (ip_address) {
    await pool.query(
      "INSERT INTO password_reset_attempts(id, email_address,ip_address,time,expire) VALUES($1::UUID,$2::TEXT,$3,NOW(),NOW() + INTERVAL '1 day')",
      [v4(), email_address, ip_address]
    );
  }

  // Create the expiring password reset token:
  const id = v4();
  await pool.query(
    "INSERT INTO password_reset(id,email_address,expire) VALUES($1::UUID,$2::TEXT,$3::TIMESTAMP)",
    [id, email_address, expireTime(ttl_s)]
  );

  return id;
}
