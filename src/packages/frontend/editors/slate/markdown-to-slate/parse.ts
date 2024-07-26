/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Descendant } from "slate";
import { handlers } from "./register";
import { State, Token } from "./types";
import { parse_markdown } from "./parse-markdown";
import { ensureDocNonempty } from "../padding";
import { createMetaNode } from "../elements/meta/type";
import { createReferencesNode } from "../elements/references/type";
import normalize from "./normalize";
import { len } from "@cocalc/util/misc";

export function parse(token: Token, state: State, cache?): Descendant[] {
  // console.log("parse", JSON.stringify({ token, state }));

  if (token.type == "image") {
    // The image token that comes out of markdown-it is very weird, since if you do
    //  [foo](bar.png)
    // then it makes foo be the *child* of bar.png and sets no alt tag.  That just
    // makes absolutely no sense at all, so we workaround this (bug?!) as follows.
    // If this bug gets fixed upstream, then I guess the code below would safely become a no-op.
    // I should report this.
    if ((token.children?.length ?? 0) > 0) {
      if (token.attrs != null && token.children?.[0].content != null) {
        // checks above to make typescript happy
        token.attrs[1] = ["alt", token.children[0].content];
      }
      token.children = [];
    }
  }
  for (const handler of handlers) {
    const nodes: Descendant[] | undefined = handler({ token, state, cache });
    if (nodes != null) {
      // console.log("parse got ", JSON.stringify(nodes));
      return nodes;
    }
  }

  throw Error(
    `some handler must process every token -- ${JSON.stringify(token)}`
  );
}

export function markdown_to_slate(
  markdown: string,
  no_meta?: boolean,
  cache?
): Descendant[] {
  // Parse the markdown:
  // const t0 = Date.now();
  const { tokens, meta, lines, references } = parse_markdown(markdown, no_meta);
  // window.markdown_parse = { tokens, meta, lines, references };

  const doc: Descendant[] = [];
  if (meta != null) {
    doc.push(createMetaNode(meta));
  }
  const state: State = { marks: {}, nesting: 0, lines };
  for (const token of tokens) {
    for (const node of parse(token, state, cache)) {
      doc.push(node);
    }
  }
  if (references != null && len(references) > 0) {
    doc.push(createReferencesNode(references));
  }

  ensureDocNonempty(doc);

  /*
  Why normalize?  It's critial that the slatejs
  tree produced by this code is normalized, as defined here:

      https://docs.slatejs.org/concepts/10-normalizing

  ... and also as it is carried out in practice with our normalization plugins
  that are in ../normalize.ts.

  The reason is that any time normalization results in a change from the
  source markdown document, then every single update to the document
  keeps redoing exactly that extra update! This leads to extensive problems.
  If you suspect this, enable EXPENSIVE_DEBUG in ./editable-markdown.tsx
  and edit a document, watching the console.log.

  I've tried to make it so the parser here is always normalized. However,
  there always seem to be really subtle edge cases.  Also, in the long run
  other people working on this code could add normalizations to
  ./normalize.ts and mess up this parser ever so slightly.  So instead,
  we just always normalize.  This isn't too expensive, and is worth it
  to ensure sanity.
  */
  //   console.log(
  //     "time: markdown_to_slate without normalize",
  //     Date.now() - t0,
  //     "ms"
  //   );
  const ndoc = normalize(doc);

  // console.log("time: markdown_to_slate", Date.now() - t0, "ms");
  // console.log({ markdown_to_slate: JSON.stringify(doc) });
  return ndoc;
}
