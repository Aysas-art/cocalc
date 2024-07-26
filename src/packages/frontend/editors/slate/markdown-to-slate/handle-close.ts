/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Descendant } from "slate";
import { State } from "./types";
import { getMarkdownToSlate } from "../elements/register";
import { register } from "./register";
import { parse } from "./parse";
import getSource from "./source";
import { setCache } from "./cache";

function handleClose({ token, state, cache }) {
  if (!state.close_type) return;
  if (state.contents == null) {
    throw Error("bug -- state.contents must not be null");
  }

  // Currently collecting the contents to parse when we hit the close_type.

  if (token.type == state.open_type) {
    // Hitting same open type *again* (it's nested), so increase nesting.
    state.nesting += 1;
  }

  if (token.type === state.close_type) {
    // Hit the close_type
    if (state.nesting > 0) {
      // We're nested, so just go up one.
      state.nesting -= 1;
    } else {
      // Not nested, so done: parse the accumulated array of children
      // using a new state:
      const child_state: State = {
        nesting: 0,
        marks: state.marks,
        lines: state.lines,
      };
      const children: Descendant[] = [];
      let isEmpty = true;
      // Note a RULE: "Block nodes can only contain other blocks, or inline and text nodes."
      // See https://docs.slatejs.org/concepts/10-normalizing
      // This means that all children nodes here have to be either *inline/text* or they
      // all have to be blocks themselves -- no mixing.  Our markdown parser I think also
      // does this, except for one weird special case which involves hidden:true that is
      // used for tight lists.

      state.tight = false;
      for (const token2 of state.contents) {
        for (const node of parse(token2, child_state, cache)) {
          if (child_state.tight) {
            state.tight = true;
          }
          isEmpty = false;
          children.push(node);
        }
      }
      // console.log("children = ", JSON.stringify(children), isEmpty);
      if (isEmpty) {
        // it is illegal for the children to be empty.
        if (token.type == "list_item_close") {
          // This is to match with the rule in ../normalize defined in
          // ensureListContainsListItems that "if the the children of the
          // list item are leaves, wrap them all in a paragraph".
          children.push({ children: [{ text: "" }], type: "paragraph" });
        } else {
          children.push({ text: "" });
        }
      }
      const i = state.close_type.lastIndexOf("_");
      const type = state.close_type.slice(0, i);
      delete state.close_type;
      delete state.contents;

      const markdownToSlate = getMarkdownToSlate(type);
      const node = markdownToSlate({
        type,
        token,
        children,
        state,
        isEmpty,
        cache,
      });
      if (type == "bullet_list" || type == "ordered_list") {
        // tight-ness is ONLY used by lists and we only want it to propagate
        // up to the enclosing list.
        delete state.tight;
      }
      if (node == null) {
        return [];
      }
      if (
        cache != null &&
        state.open_token?.level === 0 &&
        state.open_token?.map != null
      ) {
        const markdown = getSource({
          start: state.open_token.map[0],
          end: state.open_token.map[1],
          lines: state.lines,
        });
        setCache({ cache, node, markdown });
      }
      return [node];
    }
  }

  state.contents.push(token);
  return [];
}

register(handleClose);
