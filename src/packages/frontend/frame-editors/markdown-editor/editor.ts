/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level react component for editing markdown documents
*/

import { set } from "@cocalc/util/misc";
import { CodemirrorEditor } from "../code-editor/codemirror-editor";
import { createEditor } from "../frame-tree/editor";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { SETTINGS_SPEC } from "../settings/editor";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import { RenderedMarkdown } from "./rendered-markdown";
import { EditableMarkdown } from "./slate";
import { TableOfContents } from "./table-of-contents";

const EDITOR_SPEC: EditorSpec = {
  slate: {
    placeholder: "Enter text...",
    short: "Text",
    name: "Editable Text",
    icon: "pencil",
    component: EditableMarkdown,
    commands: set([
      "format_action",
      "chatgpt",
      // "print",
      "decrease_font_size",
      "increase_font_size",
      // "save",
      "time_travel",
      // "show_table_of_contents",
      //"replace",
      //"find",
      //"goto_line",
      //"cut",
      //"paste",
      //"copy",
      "undo",
      "redo",
      "readonly_view", // change frame to readonly view (for now, at least).
      "sync",
      "help",
    ]),
    buttons: set([
      "readonly_view",
      "decrease_font_size",
      "increase_font_size",
      "sync",
      "show_table_of_contents",
    ]),
  } as EditorDescription,
  cm: {
    placeholder: "Enter markdown...",
    short: "Markdown",
    name: "Markdown Code",
    icon: "markdown",
    component: CodemirrorEditor,
    commands: set([
      "format_action",
      "chatgpt",
      // "print",
      "decrease_font_size",
      "increase_font_size",
      // "save",
      "time_travel",
      // "show_table_of_contents",
      "replace",
      "find",
      "goto_line",
      "cut",
      "paste",
      "copy",
      "undo",
      "redo",
      // "format",
      "sync",
    ]),
    format_bar: true,
    format_bar_exclude: {
      format_buttons: true,
    },
    buttons: set([
      "decrease_font_size",
      "increase_font_size",
      "sync",
      "show_table_of_contents",
      "format-header",
      "format-text",
      "format-font",
      "format-font-family",
      "format-font-size",
      "format-color",
    ]),
  } as EditorDescription,
  markdown: {
    short: "Locked",
    name: "Locked View",
    icon: "lock",
    component: RenderedMarkdown,
    commands: set([
      "chatgpt",
      // "print",
      "decrease_font_size",
      "increase_font_size",
      // "show_table_of_contents",
      "time_travel",
      "undo", // need these because button bars at top let you do something even in rendered only view.
      // "save",
      "redo",
      "edit", // change frame to editable slate
    ]),
    buttons: set(["edit", "decrease_font_size", "increase_font_size"]),
  } as EditorDescription,
  markdown_table_of_contents: {
    short: "Contents",
    name: "Table of Contents",
    icon: "align-right",
    component: TableOfContents,
    commands: set(["decrease_font_size", "increase_font_size"]),
  } as EditorDescription,
  terminal,
  settings: SETTINGS_SPEC,
  time_travel,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "MarkdownEditor",
});
