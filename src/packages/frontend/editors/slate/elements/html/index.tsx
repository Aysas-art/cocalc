/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { register, SlateElement } from "../register";
import { toSlate as toSlateImage } from "../image";
import HTML from "@cocalc/frontend/components/html-ssr";

export interface HtmlInline extends SlateElement {
  type: "html_inline";
  isInline: true;
  isVoid: true;
  html: string;
}

export interface HtmlBlock extends SlateElement {
  type: "html_block";
  isInline: false;
  isVoid: true;
  html: string;
}

const StaticElement = ({ attributes, element }) => {
  const html = ((element.html as string) ?? "").trim();
  if (element.type == "html_inline") {
    return (
      <span {...attributes} style={{ display: "inline" }}>
        <HTML inline value={html} />
      </span>
    );
  } else {
    return (
      <div {...attributes}>
        <HTML value={html} />
      </div>
    );
  }
};

register({
  slateType: ["html_inline", "html_block"],

  toSlate: ({ type, token, children }) => {
    // Special case of images (one line, img tag);
    // we use a completely different function.
    if (
      token.content.startsWith("<img ") &&
      token.content.trim().split("\n").length <= 1
    ) {
      return toSlateImage({ type, token, children });
    }
    return {
      type: token.type,
      isVoid: true,
      isInline: token.type == "html_inline",
      html: token.content,
      children,
    };
  },

  StaticElement,
});
