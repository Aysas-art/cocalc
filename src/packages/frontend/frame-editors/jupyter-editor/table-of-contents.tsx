/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { delay } from "awaiting";
import { React, useRedux } from "@cocalc/frontend/app-framework";
import { JupyterEditorActions } from "./actions";
import {
  TableOfContents as TOC,
  TableOfContentsEntryList,
} from "@cocalc/frontend/components";

interface Props {
  font_size: number;
  actions: JupyterEditorActions;
}

export const TableOfContents: React.FC<Props> = React.memo(
  ({ font_size, actions }) => {
    const contents: TableOfContentsEntryList | undefined = useRedux([
      actions.jupyter_actions.name,
      "contents",
    ]);

    async function jump_to_cell(id: string, extra = "top" as "top"): Promise<void> {
      actions.jump_to_cell(id, extra);
      // stupid hack due to rendering/windowing delays...
      await delay(100);
      actions.jump_to_cell(id, extra);
    }

    return (
      <TOC
        contents={contents}
        style={{ fontSize: `${font_size - 6}px` }}
        scrollTo={({ id, extra }) => jump_to_cell(id, extra)}
      />
    );
  },
);
