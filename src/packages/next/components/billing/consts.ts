/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

export const MainPages = ["cards", "subscriptions", "receipts"] as const;
export type MainPagesType = typeof MainPages[number];
