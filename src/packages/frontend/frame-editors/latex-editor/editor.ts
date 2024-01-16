/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Spec for editing LaTeX documents.
*/

import { set } from "@cocalc/util/misc";
import { IS_IOS, IS_IPAD } from "../../feature";
import { CodemirrorEditor } from "../code-editor/codemirror-editor";
import { createEditor } from "../frame-tree/editor";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { TableOfContents } from "../markdown-editor/table-of-contents";
import { SETTINGS_SPEC } from "../settings/editor";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import { Build } from "./build";
import { ErrorsAndWarnings } from "./errors-and-warnings";
import { LatexWordCount } from "./latex-word-count";
import { PDFEmbed } from "./pdf-embed";
import { PDFJS } from "./pdfjs";
import { pdf_path } from "./util";

export const pdfjs_buttons = set([
  "print",
  "download",
  "decrease_font_size",
  "increase_font_size",
  "set_zoom",
  "zoom_page_width",
  "zoom_page_height",
  "sync",
]);

const EDITOR_SPEC: EditorSpec = {
  cm: {
    short: "Source",
    name: "LaTeX Source Code",
    icon: "code",
    component: CodemirrorEditor,
    buttons: set([
      "build",
      "print",
      "decrease_font_size",
      "increase_font_size",
      "save",
      "time_travel",
      "replace",
      "find",
      "goto_line",
      "chatgpt",
      "cut",
      "paste",
      "copy",
      "undo",
      "redo",
      "sync",
      "help",
      "format",
      "switch_to_file",
      "show_table_of_contents",
    ]),
    gutters: ["Codemirror-latex-errors"],
    format_bar: true,
    format_bar_exclude: {
      strikethrough: true,
      SpecialChar: true,
      image: true,
      unformat: true,
      font_dropdowns: true, // disabled until we can properly implement them!
    },
  } as EditorDescription,

  pdfjs_canvas: {
    short: "PDF (preview)",
    name: "PDF - Preview",
    icon: "file-pdf",
    component: PDFJS,
    buttons: pdfjs_buttons,
    path: pdf_path,
    style: { background: "#525659" },
    renderer: "canvas",
  } as EditorDescription,

  error: {
    short: "Errors",
    name: "Errors and Warnings",
    icon: "bug",
    component: ErrorsAndWarnings,
    buttons: set(["build"]),
  } as EditorDescription,

  build: {
    short: "Build",
    name: "Build Control and Log",
    icon: "terminal",
    component: Build,
    buttons: set([
      "build",
      "force_build",
      "clean",
      "decrease_font_size",
      "increase_font_size",
      "rescan_latex_directive",
    ]),
  } as EditorDescription,

  latex_table_of_contents: {
    short: "Contents",
    name: "Table of Contents",
    icon: "align-right",
    component: TableOfContents,
    buttons: set(["decrease_font_size", "increase_font_size"]),
  } as EditorDescription,

  word_count: {
    short: "Word Count",
    name: "Word Count",
    icon: "file-alt",
    buttons: set(["word_count"]),
    component: LatexWordCount,
  } as EditorDescription,

  terminal,

  settings: SETTINGS_SPEC,

  time_travel,
} as const;

// See https://github.com/sagemathinc/cocalc/issues/5114
if (!IS_IPAD && !IS_IOS) {
  (EDITOR_SPEC as any).pdf_embed = {
    short: "PDF (native)",
    name: "PDF - Native",
    icon: "file-pdf",
    buttons: set(["print", "save", "download"]),
    component: PDFEmbed,
    path: pdf_path,
  } as EditorDescription;
}

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "LaTeXEditor",
});
