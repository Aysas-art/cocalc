/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

// This is very similar to handling anchor tags, but instead
// for the <details>...</details> html element.

import { register } from "./register";
import { Descendant } from "slate";
import { State } from "./types";
import { getMarkdownToSlate } from "../elements/register";
import { parse } from "./parse";
import { ensureTextStartAndEnd } from "./normalize";
import getSource from "./source";
import { setCache } from "./cache";
import { getAttrs } from "./util";

// This matches things like "<detaiLS    OPEN  >\n", but
// not "<details foo> <div> ...".
const OPEN_TAG = /^\s*<details(\s+open)?\s*>\s*$/i;
const OPEN_WITH_SUMMARY_TAG =
  /^\s*<details(\s+open)?\s*>\s*<summary>[\s\S]*<\/summary>\s*$/i;
// This matches things like '</detaiLS>\n'
const CLOSE_TAG = /^\s*<\/details\s*>\s*$/i;

register(({ token, state }) => {
  if (state.details != null) return; // already handling a details tag
  if (
    !token.type.startsWith("html_") ||
    (!OPEN_TAG.test(token.content) &&
      !OPEN_WITH_SUMMARY_TAG.test(token.content))
  ) {
    return;
  }
  /*
  There are two possibilities:

  - html_inline token with <details> tag. We wait for corresponding </details> inline tag,
    collecting content as we go (just like for anchor-tags).  Note that details is a block
    level html tag, so supporting inline deetails isn't really critical, but we do for
    compatibility.

  - html_block token starting with <details>. We then wait for corresponding </details> block.
    this is weird, and is emulating the hack that works in usual markdown with its silly html
    string output. This allows for
    <details>

    any markdown

    </details>
    to work, with the markdown NOT treated as html.  This is consistent with how things behave
    in commonmark, e.g., github, Jupyter, etc., so it is the way to go.

  - html_block of the form <details [open]>...<summary>...</summary>.  Here the contents of
    summary replaces "Details".

  - if its an html_block that is NOT equal to <details>, then we should treat it as plain html
    so we don't make a special details markdown object at all and this code doesn't apply.
  */

  // starting an anchor tag
  state.contents = [];
  state.details = token;
  // TODO/NOTE: we aren't supporting the style attr.
  state.attrs = getAttrs(token.content, ["open"]);
  state.nesting = 0;
  return [];
});

const type = "details";

// handle gathering everything between anchor tags and
// processing result when we hit a closing anchor tag.
register(({ token, state, cache }) => {
  if (state.details == null) return; // not currently handling details tag
  if (state.contents == null) {
    throw Error("bug -- state.contents must not be null");
  }

  if (token.type.startsWith("html_")) {
    // possibly change nesting or finish current details element
    const { content } = token;
    if (OPEN_TAG.test(content) || OPEN_WITH_SUMMARY_TAG.test(content)) {
      // increase nesting
      state.nesting += 1;
    } else if (CLOSE_TAG.test(content)) {
      if (state.nesting > 0) {
        state.nesting -= 1;
      } else {
        // done!

        // Start -- this will get refactored
        // Not nested, so done: parse the accumulated array of children
        // using a new state:
        const child_state: State = {
          nesting: 0,
          marks: state.marks,
          lines: state.lines,
        };
        const children: Descendant[] = [];
        for (const token2 of state.contents) {
          for (const node of parse(token2, child_state, cache)) {
            children.push(node);
          }
        }
        if (token.type == "html_inline") {
          ensureTextStartAndEnd(children);
        }
        const markdownToSlate = getMarkdownToSlate(type);
        const node = markdownToSlate({
          type,
          children,
          token: state.details,
          state,
          cache,
        });
        if (node == null) {
          // this won't happen, but it's for typescript
          return [];
        }
        if (cache != null) {
          if (
            state.details.level == 0 &&
            state.details.map != null &&
            token.level == 0 &&
            token.map != null
          ) {
            const markdown = getSource({
              start: state.details.map[0],
              end: token.map[1],
              lines: state.lines,
            });
            setCache({ cache, node, markdown });
          }
        }
        // End -- refactor to here.

        delete state.contents;
        delete state.details;
        delete state.attrs;
        return [node];
      }
    }
  }

  // currently gathering between anchor tags:
  state.contents.push(token);
  return []; // we handled this token.
});
