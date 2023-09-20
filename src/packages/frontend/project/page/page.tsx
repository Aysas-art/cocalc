/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { DndContext, useDraggable } from "@dnd-kit/core";
import { Modal } from "antd";

import {
  React,
  redux,
  useActions,
  useEffect,
  useMemo,
  useRedux,
  useState,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { useAppState } from "@cocalc/frontend/app/context";
import { Loading } from "@cocalc/frontend/components";
import {
  FrameContext,
  defaultFrameContext,
} from "@cocalc/frontend/frame-editors/frame-tree/frame-context";
import { EDITOR_PREFIX, path_to_tab } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { AnonymousName } from "../anonymous-name";
import {
  ProjectContext,
  useProjectContext,
  useProjectContextProvider,
} from "../context";
import { ProjectWarningBanner } from "../project-banner";
import { StartButton } from "../start-button";
import { DeletedProjectWarning } from "../warnings/deleted";
import { DiskSpaceWarning } from "../warnings/disk-space";
import { OOMWarning } from "../warnings/oom";
import { RamWarning } from "../warnings/ram";
import { FIX_BORDERS } from "./common";
import { Content } from "./content";
import { isFixedTab } from "./file-tab";
import { FlyoutBody } from "./flyouts/body";
import { FLYOUT_DEFAULT_WIDTH_PX } from "./flyouts/consts";
import { FlyoutHeader } from "./flyouts/header";
import {
  getFlyoutExpanded,
  getFlyoutWidth,
  storeFlyoutState,
} from "./flyouts/state";
import HomePageButton from "./home-page/button";
import { SoftwareEnvUpgrade } from "./software-env-upgrade";
import Tabs, { FIXED_TABS_BG_COLOR, VerticalFixedTabs } from "./tabs";
import StudentPayUpgrade from "@cocalc/frontend/purchases/student-pay";

const PAGE_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
} as const;

interface Props {
  project_id: string;
  is_active: boolean;
}

export const ProjectPage: React.FC<Props> = (props: Props) => {
  const { project_id, is_active } = props;
  const hideActionButtons = useTypedRedux({ project_id }, "hideActionButtons");
  const flyout = useTypedRedux({ project_id }, "flyout");
  const actions = useActions({ project_id });
  const is_deleted = useRedux([
    "projects",
    "project_map",
    project_id,
    "deleted",
  ]);
  const projectCtx = useProjectContextProvider(project_id, is_active);
  const fullscreen = useTypedRedux("page", "fullscreen");
  const active_top_tab = useTypedRedux("page", "active_top_tab");
  const modal = useTypedRedux({ project_id }, "modal");
  const open_files_order = useTypedRedux({ project_id }, "open_files_order");
  const active_project_tab = useTypedRedux(
    { project_id },
    "active_project_tab"
  );
  const [homePageButtonWidth, setHomePageButtonWidth] =
    React.useState<number>(80);

  const [flyoutWidth, setFlyoutWidth] = useState<number>(
    getFlyoutWidth(project_id)
  );
  const [oldFlyoutWidth, setOldFlyoutWidth] = useState(flyoutWidth);
  const { pageWidthPx } = useAppState();

  const narrowerPX = useMemo(() => {
    return hideActionButtons ? homePageButtonWidth : 0;
  }, [hideActionButtons, homePageButtonWidth]);

  useEffect(() => {
    const name = getFlyoutExpanded(project_id);
    if (isFixedTab(name)) {
      // if there is one to show, restore its width
      setFlyoutWidth(getFlyoutWidth(project_id));
      actions?.setFlyoutExpanded(name, true, false);
    }
  }, [project_id]);

  useEffect(() => {
    if (flyoutWidth > pageWidthPx / 2) {
      setFlyoutWidth(Math.max(FLYOUT_DEFAULT_WIDTH_PX / 2, pageWidthPx / 2));
    }
  }, [pageWidthPx]);

  function setWidth(newWidth: number, reset = false): void {
    if (flyout == null) return;
    setFlyoutWidth(newWidth);
    storeFlyoutState(project_id, flyout, { width: reset ? null : newWidth });
  }

  async function resetFlyoutWidth() {
    // brief delay to ignore what dragging does
    await new Promise((resolve) => setTimeout(resolve, 10));
    setWidth(FLYOUT_DEFAULT_WIDTH_PX + narrowerPX, true);
  }

  const flyoutLimit = useMemo(() => {
    return {
      left: FLYOUT_DEFAULT_WIDTH_PX / 2,
      right: pageWidthPx / 2,
    };
  }, [pageWidthPx]);

  function updateDrag(e) {
    const newWidth = Math.max(
      flyoutLimit.left,
      Math.min(oldFlyoutWidth + e.delta.x, flyoutLimit.right)
    );
    setWidth(newWidth);
  }

  function renderEditorContent() {
    const v: JSX.Element[] = [];

    open_files_order.map((path) => {
      if (!path) {
        return;
      }
      const tab_name = path_to_tab(path);
      return v.push(
        <FrameContext.Provider
          key={tab_name}
          value={{
            ...defaultFrameContext,
            project_id,
            path,
            actions: redux.getEditorActions(project_id, path) as any,
            isFocused: active_project_tab === tab_name,
            isVisible: active_project_tab === tab_name,
            redux,
          }}
        >
          <Content
            is_visible={
              active_top_tab == project_id && active_project_tab === tab_name
            }
            tab_name={tab_name}
          />
        </FrameContext.Provider>
      );
    });
    return v;
  }

  // fixed tab -- not an editor
  function render_project_content() {
    if (!is_active) {
      // see https://github.com/sagemathinc/cocalc/issues/3799
      // Some of the fixed project tabs (none editors) are hooked
      // into redux and moronic about rendering everything on every
      // tiny change... Until that is fixed, it is critical to NOT
      // render these pages at all, unless the tab is active
      // and they are visible.
      return;
    }
    if (active_project_tab.slice(0, 7) !== EDITOR_PREFIX) {
      return (
        <Content
          key={active_project_tab}
          is_visible={true}
          tab_name={active_project_tab}
        />
      );
    }
  }

  function render_project_modal() {
    if (!is_active || !modal) return;
    return (
      <Modal
        title={modal?.get("title")}
        open={is_active && modal != null}
        onOk={() => {
          actions?.clear_modal();
          modal?.get("onOk")?.();
        }}
        onCancel={() => {
          actions?.clear_modal();
          modal?.get("onCancel")?.();
        }}
      >
        {modal?.get("content")}
      </Modal>
    );
  }

  function renderFlyout() {
    if (!flyout) return;
    return (
      <div style={{ display: "flex", flexDirection: "row" }}>
        <FlyoutBody flyout={flyout} flyoutWidth={flyoutWidth} />
        <DndContext
          onDragStart={() => setOldFlyoutWidth(flyoutWidth)}
          onDragEnd={(e) => updateDrag(e)}
        >
          <FlyoutDragbar
            resetFlyoutWidth={resetFlyoutWidth}
            flyoutLimit={flyoutLimit}
            oldFlyoutWidth={oldFlyoutWidth}
          />
        </DndContext>
      </div>
    );
  }

  function renderFlyoutHeader() {
    if (!flyout) return;
    return (
      <FlyoutHeader
        flyoutWidth={flyoutWidth}
        flyout={flyout}
        narrowerPX={narrowerPX}
      />
    );
  }

  if (open_files_order == null) {
    return <Loading />;
  }

  const style = {
    ...PAGE_STYLE,
    ...(!fullscreen ? { paddingTop: "3px" } : undefined),
  } as const;

  return (
    <ProjectContext.Provider value={projectCtx}>
      <div className="container-content" style={style}>
        <StudentPayUpgrade project_id={project_id} />
        <AnonymousName project_id={project_id} />
        <DiskSpaceWarning project_id={project_id} />
        <RamWarning project_id={project_id} />
        <OOMWarning project_id={project_id} />
        <SoftwareEnvUpgrade project_id={project_id} />
        <ProjectWarningBanner />
        {(!fullscreen || fullscreen == "project") && (
          <div style={{ display: "flex", margin: "0" }}>
            <HomePageButton
              project_id={project_id}
              active={active_project_tab == "home"}
              width={homePageButtonWidth}
            />
            {renderFlyoutHeader()}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <Tabs project_id={project_id} />
            </div>
          </div>
        )}
        {is_deleted && <DeletedProjectWarning />}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {!hideActionButtons && (!fullscreen || fullscreen == "project") && (
            <div
              style={{
                background: FIXED_TABS_BG_COLOR,
                borderRadius: "0",
                borderTop: FIX_BORDERS.borderTop,
                borderRight:
                  flyout == null ? FIX_BORDERS.borderRight : undefined,
              }}
            >
              <VerticalFixedTabs
                setHomePageButtonWidth={setHomePageButtonWidth}
              />
            </div>
          )}
          {renderFlyout()}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflowX: "auto",
            }}
          >
            <StartButton />
            {renderEditorContent()}
            {render_project_content()}
            {render_project_modal()}
          </div>
        </div>
      </div>
    </ProjectContext.Provider>
  );
};

function FlyoutDragbar({
  resetFlyoutWidth,
  flyoutLimit,
  oldFlyoutWidth,
}: {
  resetFlyoutWidth: () => void;
  flyoutLimit: { left: number; right: number };
  oldFlyoutWidth: number;
}) {
  const { project_id } = useProjectContext();

  const { attributes, listeners, setNodeRef, transform, active } = useDraggable(
    {
      id: `flyout-drag-${project_id}`,
    }
  );

  // limit left-right dx movement
  const dx = useMemo(() => {
    if (!transform || !oldFlyoutWidth) return 0;
    const dx = transform.x;
    const posX = oldFlyoutWidth + dx;
    const { left, right } = flyoutLimit;
    if (posX < left) return -(oldFlyoutWidth - left);
    if (posX > right) return right - oldFlyoutWidth;
    return dx;
  }, [transform, oldFlyoutWidth, flyoutLimit]);

  return (
    <div
      ref={setNodeRef}
      className="cc-project-flyout-dragbar"
      style={{
        transform: transform ? `translate3d(${dx}px, 0, 0)` : undefined,
        flex: "1 0 ",
        width: "5px",
        height: "100%",
        cursor: "col-resize",
        ...(active ? { zIndex: 1000, backgroundColor: COLORS.GRAY } : {}),
      }}
      {...listeners}
      {...attributes}
      onDoubleClick={resetFlyoutWidth}
    />
  );
}
