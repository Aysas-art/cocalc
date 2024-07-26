/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { basename } from "path";
export { getExtension, containingPath } from "@cocalc/util/misc";

export function isUUID(s: string): boolean {
  // todo: add full check.
  return typeof s == "string" && s.length == 36;
}

export function isSha1Hash(s: string): boolean {
  return typeof s == "string" && s.length == 40;
  // todo: could add full check (i.e., each character is in 0-e)
}

export function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function getTitle({
  path,
  relativePath,
}: {
  path: string;
  relativePath: string;
}): string {
  const b = basename(relativePath);
  return b ? b : basename(path);
}
