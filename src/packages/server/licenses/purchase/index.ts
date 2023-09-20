/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// **TODO: This is deprecated and replaced by server/purchases/purchase-shopping-cart-item.ts **


import { getLogger } from "@cocalc/backend/logger";
import { PurchaseInfo } from "@cocalc/util/licenses/purchase/types";
const logger = getLogger("purchaseLicense");

export default async function purchaseLicense(
  account_id: string,
  info: PurchaseInfo,
  noThrottle?: boolean
): Promise<string> {
  throw Error("DEPRECATED");
  logger.debug("info=", info, ", account_id=", account_id, noThrottle);
  return "";
}
