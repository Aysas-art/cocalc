/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Update which tasks and hashtags are visible, and their order.
*/

import { List, Map, Set, fromJS } from "immutable";

import {
  cmp,
  parse_hashtags,
  search_match,
  search_split,
} from "@cocalc/util/misc";
import { get_search } from "./search";
import { SORT_INFO, HEADINGS, HEADINGS_DIR } from "./headings-info";
import { Counts, LocalTaskStateMap, LocalViewStateMap, TaskMap } from "./types";

// Show tasks for a few seconds, even after marked done:
export const DONE_CUTOFF_MS = 3 * 1000;

export function update_visible(
  tasks: Map<string, TaskMap>,
  local_task_state: LocalTaskStateMap,
  local_view_state: LocalViewStateMap,
  counts: Counts,
  current_task_id?: string,
) {
  const show_deleted = !!local_view_state.get("show_deleted");
  const show_done = !!local_view_state.get("show_done");

  const now = Date.now();
  const _is_visible: { [id: string]: boolean } = {}; // cache
  let redoSoonMs = 0;
  function is_visible(task: TaskMap, id: string): boolean {
    const c = _is_visible[id];
    if (c != null) {
      return c;
    }

    if (!show_deleted && task.get("deleted")) {
      _is_visible[id] = false;
    } else if (!show_done && task.get("done")) {
      if (now - (task.get("last_edited") ?? 0) > DONE_CUTOFF_MS) {
        _is_visible[id] = false;
      } else {
        _is_visible[id] = true;
        const redo = DONE_CUTOFF_MS - (now - (task.get("last_edited") ?? 0));
        if (redo > 0) {
          redoSoonMs = Math.max(redo, redoSoonMs) + 1000;
        }
      }
    } else {
      _is_visible[id] = true;
    }
    return _is_visible[id];
  }

  const relevant_tags: { [tag: string]: true } = {};
  tasks.forEach((task: TaskMap, id: string) => {
    if (!is_visible(task, id)) {
      return;
    }
    const desc = task.get("desc") ?? "";
    for (const x of parse_hashtags(desc)) {
      const tag = desc.slice(x[0] + 1, x[1]).toLowerCase();
      relevant_tags[tag] = true;
    }
  });

  const search0 = get_search(local_view_state, relevant_tags);
  const search: (string | RegExp)[] = search_split(search0.toLowerCase());

  const new_counts = {
    done: 0,
    deleted: 0,
  };
  let current_is_visible = false;

  let sort_column = local_view_state.getIn(["sort", "column"]) ?? HEADINGS[0];
  if (!HEADINGS.includes(sort_column)) {
    sort_column = HEADINGS[0];
  }
  if (SORT_INFO[sort_column] == null) {
    SORT_INFO[sort_column] = SORT_INFO[HEADINGS[0]];
  }
  const sort_info = SORT_INFO[sort_column];
  const sort_key = sort_info.key;
  let sort_dir = local_view_state.getIn(["sort", "dir"]) ?? HEADINGS_DIR[0];
  if (sort_info.reverse) {
    // reverse sort order -- done for due date
    if (sort_dir === "asc") {
      sort_dir = "desc";
    } else {
      sort_dir = "asc";
    }
  }
  // undefined always gets pushed to the bottom (only applies to due date in practice)
  const sort_default = sort_dir === "desc" ? -1e15 : 1e15;
  let hashtags = Set<string>(); // contains all the hashtags of visible tasks
  const v: [string | number | undefined, string][] = [];
  tasks.forEach((task: TaskMap, id: string) => {
    if (task.get("done")) {
      new_counts.done += 1;
    }
    if (task.get("deleted")) {
      new_counts.deleted += 1;
    }

    const editing_desc = local_task_state?.getIn([id, "editing_desc"]);
    if (!editing_desc && !is_visible(task, id)) {
      return;
    }

    const desc = task.get("desc") ?? "";
    let visible: boolean;
    if (search_match(desc, search) || editing_desc) {
      visible = true; // tag of a currently visible task
      if (id === current_task_id) {
        current_is_visible = true;
      }
      v.push([task.get(sort_key) ?? sort_default, id]);
    } else {
      visible = false; // not a tag of any currently visible task
    }

    for (const x of parse_hashtags(desc)) {
      const tag = desc.slice(x[0] + 1, x[1]).toLowerCase();
      if (visible) {
        hashtags = hashtags.add(tag);
      }
    }
  });

  if (sort_dir === "desc") {
    v.sort((a, b) => -cmp(a[0], b[0]));
  } else {
    v.sort((a, b) => cmp(a[0], b[0]));
  }

  const w = v.map((x) => x[1]);
  const visible = fromJS(w);
  if ((current_task_id == null || !current_is_visible) && visible.size > 0) {
    current_task_id = visible.get(0);
  } else if (!current_is_visible && visible.size === 0) {
    current_task_id = undefined;
  }

  if (counts.get("done") !== new_counts.done) {
    counts = counts.set("done", new_counts.done);
  }
  if (counts.get("deleted") !== new_counts.deleted) {
    counts = counts.set("deleted", new_counts.deleted);
  }
  const t: string[] = [];
  for (const x of search) {
    if (x[0] !== "#" && x[0] !== "-") {
      t.push(`${x}`);
    }
  }
  const search_terms = Set(t);
  const t2: string[] = [];
  for (const x of search) {
    if (x[0] !== "#") {
      t2.push(`${x}`);
    }
  }
  const nonhash_search = List(t2);

  return {
    visible,
    current_task_id,
    counts,
    hashtags: fromJS(hashtags),
    search_desc: search.join(" "),
    search_terms,
    nonhash_search,
    redoSoonMs,
  };
}
