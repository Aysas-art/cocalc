/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button, Popover } from "antd";
import { useEffect, useState } from "react";

import { CSS, useRedux } from "@cocalc/frontend/app-framework";
import useIsMountedRef from "@cocalc/frontend/app-framework/is-mounted-hook";
import { Icon } from "@cocalc/frontend/components/icon";
import { KernelSelector } from "@cocalc/frontend/jupyter/select-kernel";
import { Kernel } from "@cocalc/frontend/jupyter/status";
import { useFrameContext } from "../../hooks";
import { PANEL_STYLE } from "../../tools/panel";
import {
  getJupyterFrameEditorActions,
  JupyterActions,
  openJupyterNotebook,
} from "./actions";

export default function KernelPanel0() {
  const isMountedRef = useIsMountedRef();
  const {
    project_id,
    path,
    desc,
    id: frameId,
    actions: whiteboardActions,
  } = useFrameContext();
  const [actions, setActions] = useState<JupyterActions | null>(null);

  useEffect(() => {
    (async () => {
      const frameActions = await getJupyterFrameEditorActions({
        project_id,
        path,
      });
      if (!isMountedRef.current) return;
      setActions(frameActions.jupyter_actions);
    })();
  }, []);

  if (actions == null) return null;
  const state = actions.store.get("backend_state");
  if (
    desc.get("selectedTool") == "code" ||
    (state != null && state != "ready" && state != "init") ||
    whiteboardActions.selectionContainsCellOfType(frameId, "code")
  ) {
    return <KernelPanel actions={actions} />;
  }
  return null;
}

function KernelPanel({ actions }: { actions: JupyterActions }) {
  const { project_id, path } = useFrameContext();
  const showKernelSelector: undefined | boolean = useRedux([
    actions.name,
    "show_kernel_selector",
  ]);
  const style: CSS = {
    ...PANEL_STYLE,
    maxWidth: "calc(100vw - 200px)",
    padding: "0 5px 2px 5px",
    fontSize: "14px",
    right: 0,
    ...(showKernelSelector && {
      bottom: "10px",
      top: "10px",
      overflowY: "auto",
    }),
  };
  return (
    <div style={style}>
      <div style={{ display: "flex" }}>
        <div style={{ flex: 1 }}></div>
        <div>
          <Kernel actions={actions} />
        </div>
        <Popover
          title={
            <>
              <Icon name="jupyter" /> Jupyter Notebook
            </>
          }
          content={
            <div style={{ maxWidth: "300px" }}>
              Code in this whiteboard is copied to a Jupyter notebook and
              executed; click here to open that notebook. Do <b>not</b> expect
              to be able to edit code in that notebook and have changes
              reflected in the whiteboard.
            </div>
          }
        >
          <Button
            style={{ color: "#666" }}
            size="small"
            onClick={() => {
              openJupyterNotebook({ project_id, path });
            }}
          >
            <Icon name="external-link" />
          </Button>
        </Popover>
      </div>
      {showKernelSelector && <KernelSelector actions={actions} />}
    </div>
  );
}
