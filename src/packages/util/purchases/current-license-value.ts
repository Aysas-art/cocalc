/*
Compute the current remaining value of an existing partly used license
for refund or other purposes.
*/

import type { PurchaseInfo } from "@cocalc/util/licenses/purchase/types";
import { compute_cost } from "@cocalc/util/licenses/purchase/compute-cost";
import { ONE_HOUR_MS } from "@cocalc/util/consts/billing";

interface Options {
  info: PurchaseInfo;
}

export default function currentLicenseValue({ info }: Options): number {
  if (info.type !== "quota") {
    // We do not provide any prorated refund for ancient license types.
    return 0;
  }
  if (info.end == null || info.start == null) {
    // infinite value?
    return 0;
  }
  if (info.cost_per_hour) {
    // if this is set, we use it to compute the value
    // The value is cost_per_hour times the number of hours left until info.end.
    const hoursRemaining = (info.end.valueOf() - Date.now()) / ONE_HOUR_MS;
    // the hoursRemaining can easily be *negative* if info.end is in the past.
    // However the value of a license is never negative, so we max with 0.
    return Math.max(0, hoursRemaining * info.cost_per_hour);
  }

  // fall back to computing value using the current rate.
  // TODO: we want to make it so this NEVER is used.
  const price = compute_cost(info);
  return price.discounted_cost;
}
