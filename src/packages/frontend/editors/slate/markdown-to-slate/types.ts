/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Token } from "@cocalc/frontend/markdown";
export { Token };

export interface Marks {
  italic?: boolean;
  bold?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  sup?: boolean;
  sub?: boolean;
  color?: string;
}

export interface State {
  marks: Marks;
  nesting: number;
  lines: string[];

  open_type?: string;
  close_type?: string;
  open_token?: Token;
  contents?: Token[];
  attrs?: string[][];
  block?: boolean;
  tight?: boolean;

  anchor?: Token; // currnetly handling an anchor tag
  details?: Token; // currnetly handling an anchor tag
}

interface Reference {
  title?: string;
  href?: string;
}

export type References = { [name: string]: Reference };
