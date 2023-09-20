import getPool, { PoolClient } from "@cocalc/database/pool";
import editLicense from "./edit-license";
import { getSubscription } from "./renew-subscription";
import dayjs from "dayjs";
import getLicense from "@cocalc/server/licenses/get-license";

interface Options {
  account_id: string;
  subscription_id: number;
  now?: boolean;
  client?: PoolClient;
}

export default async function cancelSubscription({
  account_id,
  subscription_id,
  now,
  client,
}: Options) {
  const pool = client ?? getPool();
  await pool.query(
    "UPDATE subscriptions SET status='canceled', canceled_at=NOW() WHERE id=$1",
    [subscription_id]
  );
  if (now) {
    const subscription = await getSubscription(subscription_id);
    const { metadata, current_period_end } = subscription;
    const license = await getLicense(metadata.license_id);
    let end;
    if (license.activates != null && new Date(license.activates) > new Date()) {
      // activation in the future
      end = new Date(license.activates);
    } else {
      // 10 minutes in the future to avoid issues.
      end = dayjs().add(10, "minutes").toDate();
    }
    if (
      (license.expires != null && new Date(license.expires) <= end) ||
      current_period_end <= end
    ) {
      // license already ended
      return;
    }
    if (metadata?.type != "license" || metadata.license_id == null) {
      // only license subscriptions are currently implemented
      return;
    }
    // edit the corresponding license so that it ends right now (and user gets credit).
    await editLicense({
      isSubscriptionRenewal: true,
      account_id,
      license_id: metadata.license_id,
      changes: { end },
      note: "Canceling a subscription immediately.",
      client,
    });
  }
}
