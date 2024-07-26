/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";
import { Element } from "slate";
import { register, RenderElementProps, SlateElement } from "../register";
import { useFileContext } from "@cocalc/frontend/lib/file-context";
import DefaultMath from "@cocalc/frontend/components/math/ssr";

export interface DisplayMath extends SlateElement {
  type: "math_block";
  value: string;
  isVoid: true;
}

export interface InlineMath extends SlateElement {
  type: "math_inline";
  value: string;
  display?: boolean; // inline but acts as displayed math
  isVoid: true;
  isInline: true;
}

export const StaticElement: React.FC<RenderElementProps> = ({
  attributes,
  element,
}) => {
  const { MathComponent } = useFileContext();
  if (element.type != "math_block" && element.type != "math_inline") {
    // type guard.
    throw Error("bug");
  }
  const C = MathComponent ?? DefaultMath;
  return (
    <span {...attributes}>
      <C
        data={wrap(
          element.value,
          element.type == "math_inline" && !element.display
        )}
        inMarkdown
      />
    </span>
  );
};

function wrap(math, isInline) {
  math = "$" + math + "$";
  if (!isInline) {
    math = "$" + math + "$";
  }
  return math;
}

register({
  slateType: ["math_inline", "math_inline_double"],
  StaticElement,
  toSlate: ({ token }) => {
    return {
      type: "math_inline",
      value: stripMathEnvironment(token.content),
      isVoid: true,
      isInline: true,
      children: [{ text: "" }],
      display: token.type == "math_inline_double",
    } as Element;
  },
});

export function toDisplayMath({ token }) {
  return {
    type: "math_block",
    value: stripMathEnvironment(token.content).trim(),
    isVoid: true,
    children: [{ text: "" }],
  } as Element;
}

register({
  slateType: ["math_block", "math_block_eqno"],
  StaticElement,
  toSlate: toDisplayMath,
});

export function stripMathEnvironment(s: string): string {
  // These environments get detected, but we must remove them, since once in
  // math mode they make no sense. All the other environments do make sense.
  for (const env of ["math", "displaymath"]) {
    if (s.startsWith(`\\begin{${env}}`)) {
      return s.slice(
        `\\begin{${env}}`.length,
        s.length - `\\end{${env}}`.length
      );
    }
  }
  return s;
}
