import { CodeMirrorStatic } from "@cocalc/frontend/jupyter/codemirror-static";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import infoToMode from "@cocalc/frontend/editors/slate/elements/code-block/info-to-mode";
import { trunc_middle } from "@cocalc/util/misc";

const contextStyle = {
  overflowY: "auto",
  margin: "5px",
  padding: "5px",
  width: undefined,
} as const;

// We truncate the preview also, since displaying too much can make the UI feel slow!
const MAX_SIZE = 16000;
const MISSING =
  "\n\n...\n(middle of file is truncated from this preview only, but will be included in the question)\n...\n\n";

export default function Context({ value, info }) {
  if (!value?.trim()) {
    return (
      <b style={{ fontSize: "12pt" }}>
        No context from your file will be included.
      </b>
    );
  }
  if (info == "md" || info == "markdown") {
    return (
      <StaticMarkdown
        value={trunc_middle(value, MAX_SIZE, MISSING)}
        style={{
          ...contextStyle,
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      />
    );
  } else {
    return (
      <CodeMirrorStatic
        style={contextStyle}
        options={{
          mode: infoToMode(info),
        }}
        value={trunc_middle(value, MAX_SIZE, MISSING)}
      />
    );
  }
}
