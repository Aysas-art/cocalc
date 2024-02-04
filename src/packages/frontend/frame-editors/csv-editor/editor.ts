/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level react component for editing CSV files
*/

import { set } from "@cocalc/util/misc";
import { CodemirrorEditor } from "../code-editor/codemirror-editor";
import { createEditor } from "../frame-tree/editor";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import Grid from "./grid";

const EDITOR_SPEC: EditorSpec = {
  grid: {
    short: "Grid",
    name: "Grid",
    icon: "table",
    component: Grid,
    commands: set(["decrease_font_size", "increase_font_size", "chatgpt"]),
  },

  cm: {
    short: "Raw",
    name: "Raw Data",
    icon: "code",
    component: CodemirrorEditor,
    commands: set([
      "chatgpt",
      "print",
      "decrease_font_size",
      "increase_font_size",
      "save",
      "time_travel",
      "replace",
      "find",
      "goto_line",
      "cut",
      "paste",
      "copy",
      "undo",
      "redo",
    ]),
  } as EditorDescription,

  terminal,

  time_travel,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "CSV Editor",
});
