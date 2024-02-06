/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level react component for editing code.
*/

import { fileExtensionsSet } from "@cocalc/util/code-formatter";
import { filename_extension, set } from "@cocalc/util/misc";
import { createEditor } from "../frame-tree/editor";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import { CodemirrorEditor } from "./codemirror-editor";

export const SHELLS = {
  erl: "erl",
  hrl: "erl",
  py: "python3",
  sage: "sage",
  r: "R",
  m: "octave",
  jl: "julia",
  js: "node",
  ts: "ts-node",
  coffee: "coffee",
  gp: "gp",
  lua: "lua",
  ml: "ocaml",
  pl: "perl",
  rb: "ruby",
} as const;

export const cm = {
  short: "Code",
  name: "Source Code",
  icon: "code",
  component: CodemirrorEditor,
  commands: set([
    "print",
    "decrease_font_size",
    "increase_font_size",
    "save",
    "time_travel",
    "chatgpt",
    "replace",
    "find",
    "goto_line",
    "cut",
    "paste",
    "copy",
    "undo",
    "redo",
    "terminal",
    "format",
    "auto_indent",
    //"tour"
  ]),
  customizeCommands: {
    format: {
      isVisible: ({ props }) => {
        return fileExtensionsSet.has(filename_extension(props.path) as any);
      },
    },
  },
} as EditorDescription;

const EDITOR_SPEC: EditorSpec = {
  cm,
  terminal,
  time_travel,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "CodeEditor",
});
