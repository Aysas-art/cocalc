/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
The attachment editing toolbar functionality for cells.
*/

import { React } from "../app-framework";

import { Button } from "@cocalc/frontend/antd-bootstrap";
import { Map as ImmutableMap } from "immutable";

import { JupyterActions } from "./browser-actions";

interface AttachmentsProps {
  actions: JupyterActions;
  cell: ImmutableMap<string, any>; // TODO types
}

export const Attachments: React.FC<AttachmentsProps> = (
  props: AttachmentsProps
) => {
  const { actions, cell } = props;

  function edit(): void {
    actions.edit_attachments(cell.get("id"));
  }

  return (
    <div style={{ width: "100%" }}>
      <Button bsSize="small" onClick={edit} style={{ float: "right" }}>
        Delete Attachments...
      </Button>
    </div>
  );
};
