/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
CRM Editor Actions
*/

import {
  Actions as CodeEditorActions,
  CodeEditorState,
} from "../code-editor/actions";
import { FrameTree } from "../frame-tree/types";
import { fromJS, Map as iMap, Set as iSet } from "immutable";
import { useEditorRedux } from "@cocalc/frontend/app-framework";
import { useFrameContext } from "@cocalc/frontend/frame-editors/frame-tree/frame-context";

interface CRMEditorState extends CodeEditorState {
  // The selection is a map from view id to set of primary keys.
  // It records which records are selected in a given view.
  selection: iMap<string, iSet<any>>;
}

export function useEditor() {
  const { project_id, path } = useFrameContext();
  return useEditorRedux<CRMEditorState>({ project_id, path });
}

export class Actions extends CodeEditorActions<CRMEditorState> {
  protected doctype: string = "syncdb";
  protected primary_keys: string[] = ["table", "id"];
  protected string_cols: string[] = [];

  _init2(): void {
    this.setState({ selection: fromJS({}) });
  }

  _raw_default_frame_tree(): FrameTree {
    return { type: "tables" };
  }

  undo(_id?: string): void {
    if (this._syncstring == null) return;
    this._syncstring.undo();
    this._syncstring.commit();
  }

  redo(_id?: string): void {
    if (this._syncstring == null) return;
    this._syncstring.redo();
    this._syncstring.commit();
  }

  in_undo_mode(): boolean {
    return this._syncstring?.in_undo_mode();
  }
}
