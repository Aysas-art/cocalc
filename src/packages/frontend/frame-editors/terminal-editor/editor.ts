/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level React component for the terminal
*/

import { createEditor } from "../frame-tree/editor";
import { EditorDescription } from "../frame-tree/types";
import { TerminalFrame } from "./terminal";
import { CommandsGuide } from "./commands-guide";
import { set } from "@cocalc/util/misc";

export const terminal = {
  short: "Terminal",
  name: "Terminal",
  icon: "terminal",
  component: TerminalFrame,
  buttons: set([
    "-actions", // none of this makes much sense for a terminal!
    /*"print", */
    "decrease_font_size",
    "increase_font_size",
    /* "find", */
    "paste",
    "copy",
    "kick_other_users_out",
    "pause",
    "edit_init_script",
    "clear",
    "help",
    "connection_status",
    "guide",
    "chatgpt",
    "tour",
    /*"reload" */
  ]),
  hide_public: true, // never show this editor option for public view
  clear_info: {
    text: "Clearing this Terminal terminates a running program, respawns the shell, and cleans up the display buffer.",
    confirm: "Yes, clean up!",
  },
  guide_info: {
    title: "Guide",
    descr: "Tool for creating, testing, and learning about terminal commands.",
  },
} as EditorDescription;

const commands_guide = {
  short: "Guide",
  name: "Guide",
  icon: "magic",
  component: CommandsGuide,
  buttons: set(["decrease_font_size", "increase_font_size"]),
} as EditorDescription;

const EDITOR_SPEC = {
  terminal,
  commands_guide,
};

export const Editor = createEditor({
  format_bar: false,
  editor_spec: EDITOR_SPEC,
  display_name: "TerminalEditor",
});
