/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Spec for editing Jupyter notebooks via a frame tree.
*/

import { set } from "@cocalc/util/misc";
import { createEditor } from "../frame-tree/editor";
import { EditorDescription, EditorSpec } from "../frame-tree/types";
import { terminal } from "../terminal-editor/editor";
import { time_travel } from "../time-travel-editor/editor";
import {
  Assignments,
  Configuration,
  SharedProject,
  Students,
  Handouts,
} from "./course-panels";

const buttons = set([
  "decrease_font_size",
  "increase_font_size",
  "save",
  "time_travel" /*,
  "undo",
  "redo"*/,
]);

export const EDITOR_SPEC: EditorSpec = {
  course_students: {
    short: "Students",
    name: "Students",
    icon: "users",
    component: Students,
    buttons,
  } as EditorDescription,
  course_assignments: {
    short: "Assignments",
    name: "Assignments",
    icon: "share-square",
    component: Assignments,
    buttons,
  } as EditorDescription,
  course_handouts: {
    short: "Handouts",
    name: "Handouts",
    icon: "copy",
    component: Handouts,
    buttons,
  } as EditorDescription,
  course_configuration: {
    short: "Config",
    name: "Configuration",
    icon: "cogs",
    component: Configuration,
    buttons,
  } as EditorDescription,
  course_shared_project: {
    short: "Shared",
    name: "Shared Project",
    icon: "share-square",
    component: SharedProject,
    buttons,
  } as EditorDescription,
  terminal,
  time_travel,
} as const;

export const Editor = createEditor({
  editor_spec: EDITOR_SPEC,
  display_name: "CourseEditor",
});
