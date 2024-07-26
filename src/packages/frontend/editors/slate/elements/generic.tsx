/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React, { CSSProperties as CSS } from "react";
import { string_to_style } from "../util";
import { register, SlateElement } from "./register";
import { dict } from "@cocalc/util/misc";

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "command",
  " keygen",
  "source",
]);

export interface Generic extends SlateElement {
  type: "generic";
  isInline: boolean;
  tag: string | undefined;
  attrs: object | undefined;
}

register({
  slateType: "generic", // this is the generic plugin

  toSlate: ({ token, state, children }) => {
    let attrs: object | undefined;
    if (state.attrs != null) {
      const a: any = dict(state.attrs as any);
      if (a.style != null) {
        a.style = string_to_style(a.style as any);
      }
      attrs = a;
    } else {
      attrs = undefined;
    }
    return {
      type: "generic",
      isInline: !state.block,
      tag: token.tag ? (token.tag as string) : undefined,
      attrs,
      children,
    };
  },

  Element: ({ attributes, children, element }) => {
    const elt = element as Generic;
    if (elt.tag) {
      if (VOID_TAGS.has(elt.tag)) {
        return React.createElement(elt.tag as string, {
          ...attributes,
          ...(elt.attrs as object),
        });
      }
      let style = {} as CSS;
      if (elt.tag == "ol" || elt.tag == "ul") {
        // NOTE: this is done correctly of course in the list plugin.
        // doing it here is just redundant...
        style.marginBottom = "1em";
      }

      return React.createElement(
        elt.tag as string,
        {
          ...attributes,
          ...(elt.attrs as object),
          ...{ style },
        },
        children
      );
    }
    return (
      <p {...attributes} {...elt.attrs}>
        {children}
      </p>
    );
  },

  fromSlate: ({ children }) => `${children}\n`,
});
