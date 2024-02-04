/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level react component for editing R markdown documents
*/

import { RenderedMarkdown } from "../markdown-editor/rendered-markdown";
import { set } from "@cocalc/util/misc";
import { derive_rmd_output_filename } from "./utils";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { createEditor } from "../frame-tree/editor";
import { CodemirrorEditor } from "../code-editor/codemirror-editor";
import { SETTINGS_SPEC } from "../settings/editor";
import { IFrameHTML } from "../html-editor/iframe-html";
import { PDFJS } from "../latex-editor/pdfjs";
import { pdfjsCommands } from "../latex-editor/editor";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import { BuildLog } from "./build-log";

const EDITOR_SPEC: EditorSpec = {
  cm: {
    short: "Code",
    name: "Source Code",
    icon: "code",
    component: CodemirrorEditor,
    commands: set([
      "help",
      "format_action",
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
      "format",
      "build",
    ]),
    format_bar: true,
  } as EditorDescription,

  iframe: {
    short: "HTML",
    name: "HTML (Converted)",
    icon: "compass",
    component: IFrameHTML,
    mode: "rmd",
    path(path) {
      return derive_rmd_output_filename(path, "html");
    },
    commands: set([
      "print",
      "save",
      "time_travel",
      "reload",
      "decrease_font_size",
      "increase_font_size",
    ]),
    buttons: set(["reload", "decrease_font_size", "increase_font_size"]),
  } as EditorDescription,

  // By default, only html is generated. This viewer is still there in case the user explicitly tells RMarkdown to generate a PDF

  pdfjs_canvas: {
    short: "PDF",
    name: "PDF (Converted)",
    icon: "file-pdf",
    component: PDFJS,
    mode: "rmd",
    commands: pdfjsCommands,
    buttons: set([
      "decrease_font_size",
      "increase_font_size",
      "zoom_page_width",
      "zoom_page_height",
      "set_zoom",
    ]),
    renderer: "canvas",
    path(path) {
      return derive_rmd_output_filename(path, "pdf");
    },
  } as EditorDescription,

  markdown: {
    short: "Markdown",
    name: "Markdown (only rendered)",
    icon: "eye",
    component: RenderedMarkdown,
    reload_images: true,
    commands: set([
      "print",
      "decrease_font_size",
      "increase_font_size",
      "reload",
    ]),
    buttons: set(["decrease_font_size", "increase_font_size", "reload"]),
  } as EditorDescription,

  build: {
    short: "Build Log",
    name: "Build Log",
    icon: "gears",
    component: BuildLog,
    commands: set(["build", "decrease_font_size", "increase_font_size"]),
    buttons: set(["build"]),
  } as EditorDescription,

  terminal,

  time_travel,

  settings: SETTINGS_SPEC,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "RmdEditor",
});
