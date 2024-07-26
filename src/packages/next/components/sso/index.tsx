/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import Link from "next/link";

export function ssoNav(): JSX.Element[] {
  return [
    <Link href={"/"}>Home</Link>,
    <Link href={"/sso"}>Single Sign On</Link>,
  ];
}
