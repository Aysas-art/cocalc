/*
Static Markdown

This is a react component that renders markdown text using React.  See the
comments in mostly-static-markdown.tsx for more details, since that's a very
similar, but more complicated component.

A constraint of this component is that it should easily render in the next.js
application.
*/

import "./elements/init-ssr";
import { CSSProperties } from "react";
import "./elements/init-ssr";
import { getStaticRender } from "./elements/register";
import Leaf from "./leaf";
import { Descendant } from "slate";
import { useFileContext } from "@cocalc/frontend/lib/file-context";

interface Props {
  slate: Descendant[];
  style?: CSSProperties;
  className?: string;
}

export default function RenderStatic({ slate, style, className }: Props) {
  const fileContext = useFileContext();
  fileContext.latexState = {}; // so there is a global state for all latex that gets rendered below:
  const v: JSX.Element[] = [];
  let n = 0;
  for (const element of slate) {
    v.push(<RenderElement key={n} element={element} />);
    n += 1;
  }
  return (
    <div
      style={{
        width: "100%",
        // outline, whitespace and wordWrap are for consistency with slate-react/components/editable.tsx
        outline: "none",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        ...style,
      }}
      className={className}
    >
      {v}
    </div>
  );
}

function RenderElement({ element }) {
  let children: JSX.Element[] = [];
  if (element["children"]) {
    let n = 0;
    for (const child of element["children"]) {
      children.push(<RenderElement key={n} element={child} />);
      n += 1;
    }
  }
  if (element["type"]) {
    const C = getStaticRender(element.type);
    return <C children={children} element={element} attributes={{} as any} />;
  }
  // It's text
  return (
    <Leaf leaf={element} text={{} as any} attributes={{} as any}>
      {element["text"]}
    </Leaf>
  );
}
