/*
Let user get all of their purchase quotas.
*/

import getAccountId from "lib/account/get-account";
import getCostPerDay from "@cocalc/server/purchases/get-cost-per-day";
import getParams from "lib/api/get-params";

export default async function handle(req, res) {
  try {
    res.json(await get(req));
  } catch (err) {
    res.json({ error: `${err.message}` });
    return;
  }
}

async function get(req) {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    throw Error("must be signed in");
  }
  const { limit, offset } = getParams(req);
  return await getCostPerDay({ account_id, limit, offset });
}
