/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Top-level react component for editing markdown documents
*/

import { createElement } from "react";

import { TaskEditor } from "@cocalc/frontend/editors/task-editor/editor";
import { set } from "@cocalc/util/misc";
import { createEditor } from "../frame-tree/editor";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";

const EDITOR_SPEC = {
  tasks: {
    short: "Tasks",
    name: "Task List",
    icon: "tasks",
    component: (props) => {
      const actions = props.actions.getTaskActions(props.id);
      return createElement(TaskEditor, {
        ...props,
        actions,
        path: actions.path,
      });
    },
    buttons: set([
      "decrease_font_size",
      "increase_font_size",
      "time_travel",
      "undo",
      "redo",
      "save",
      "help",
      "export_to_markdown",
      "chatgpt",
    ]),
  },
  terminal,
  time_travel,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "TaskEditor",
});
