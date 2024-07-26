/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Descendant } from "slate";
import { State, Token } from "./types";

type Handler = (opts: {
  token: Token;
  state: State;
  cache?;
}) => Descendant[] | undefined;

export const handlers: Handler[] = [];

export function register(handler: Handler): void {
  // console.log("register", handler);
  handlers.push(handler);
}
