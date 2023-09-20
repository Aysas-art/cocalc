import getPool from "@cocalc/database/pool";
import { Service, QUOTA_SPEC } from "@cocalc/util/db-schema/purchase-quotas";
import getMinBalance from "./get-min-balance";
import type { PoolClient } from "@cocalc/database/pool";

export async function setPurchaseQuota({
  account_id,
  service,
  value,
}: {
  account_id: string;
  service: Service;
  value: number;
}): Promise<void> {
  if (!QUOTA_SPEC[service]) {
    throw Error(
      `"${service}" must be one of the following: ${Object.keys(QUOTA_SPEC)
        .filter((x) => !QUOTA_SPEC[x].noSet)
        .join(", ")}`
    );
  }
  if (QUOTA_SPEC[service]?.noSet) {
    throw Error(
      `you cannot change the quota for the service "${QUOTA_SPEC[service].display}"`
    );
  }
  if (typeof value != "number" || !Number.isFinite(value) || value < 0) {
    throw Error(`value must be a nonnegative number but it is "${value}"`);
  }
  const { services } = await getPurchaseQuotas(account_id);
  const pool = getPool();
  if (services[service] != null) {
    await pool.query(
      "UPDATE purchase_quotas SET value=$3 WHERE service=$2 AND account_id=$1",
      [account_id, service, value]
    );
  } else {
    await pool.query(
      "INSERT INTO purchase_quotas(account_id,service,value) VALUES($1,$2,$3)",
      [account_id, service, value]
    );
  }
}

export interface PurchaseQuotas {
  services: { [service: string]: number };
  minBalance: number;
}

export async function getPurchaseQuotas(
  account_id: string,
  client?: PoolClient
): Promise<PurchaseQuotas> {
  const pool = client ?? getPool();
  const { rows } = await pool.query(
    "SELECT service, value FROM purchase_quotas WHERE account_id=$1",
    [account_id]
  );
  const services: { [service: string]: number } = {};
  for (const { service, value } of rows) {
    services[service] = value ?? 0;
  }
  const minBalance = await getMinBalance(account_id, client);
  return { services, minBalance };
}

export async function getPurchaseQuota(
  account_id: string,
  service: Service,
  client?: PoolClient
): Promise<number | null> {
  const pool = client ?? getPool();
  const { rows } = await pool.query(
    "SELECT value FROM purchase_quotas WHERE account_id=$1 AND service=$2",
    [account_id, service]
  );
  return rows[0]?.value ?? null;
}
