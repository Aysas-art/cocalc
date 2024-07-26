/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Descendant } from "slate";
import { register } from "./register";
import { parse } from "./parse";
import { State } from "./types";

function handleChildren({ token, state, cache }) {
  if (!token.children || token.children.length == 0) return;

  // Parse all the children with own state, partly inherited
  // from us (e.g., the text marks).
  const child_state: State = {
    marks: { ...state.marks },
    nesting: 0,
    lines: state.lines,
  };
  const children: Descendant[] = [];
  for (const token2 of token.children) {
    for (const node of parse(token2, child_state, cache)) {
      children.push(node);
    }
  }
  /*
  SlateJS has some constraints on documents, as explained here:
         https://docs.slatejs.org/concepts/10-normalizing
  Number 4 is particular relevant here:

     4. **Inline nodes cannot be the first or last child of a parent block, nor can it be next to another inline node in the children array.** If this is the case, an empty text node will be added to correct this to be in compliance with the constraint.
  */
  if (children.length > 0 && children[0]["isInline"]) {
    children.unshift({ text: "" });
  }
  if (children.length > 0 && children[children.length - 1]["isInline"]) {
    children.push({ text: "" });
  }

  return children;
}

register(handleChildren);
