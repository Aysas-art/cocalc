/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
top right hand side in a project.
*/

import { Button as AntdButton, Tooltip } from "antd";

import { UsersViewing } from "@cocalc/frontend/account/avatar/users-viewing";
import {
  redux,
  redux_name,
  useActions,
  useAsyncEffect,
  useIsMountedRef,
  useRedux,
  useState,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { ChatActions } from "@cocalc/frontend/chat/actions";
import { Icon, Loading } from "@cocalc/frontend/components";
import { CourseActions } from "@cocalc/frontend/course/actions";
import { ArchiveActions } from "@cocalc/frontend/editors/archive/actions";
import { Actions as CodeEditorActions } from "@cocalc/frontend/frame-editors/code-editor/actions";
import { SaveButton } from "@cocalc/frontend/frame-editors/frame-tree/save-button";
import { getJupyterActions } from "@cocalc/frontend/frame-editors/whiteboard-editor/elements/code/actions";
import { tab_to_path } from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";
import { ChatButton } from "./chat-button";
import { ShareIndicator } from "./share-indicator";
import { TopBarActions } from "./types";

interface TTBAProps {
  activeTab: string;
  project_id: string;
}

export function TopTabBarActionsContainer(props: Readonly<TTBAProps>) {
  const { activeTab, project_id } = props;
  if (!activeTab.startsWith("editor-")) return null;
  const path = tab_to_path(activeTab);
  if (path == null) return null;

  return (
    <div className={"cc-project-tabs-top-right"}>
      <div className={"cc-project-tabs-top-right-slant"}></div>
      <div className={"cc-project-tabs-top-right-actions"}>
        <TopTabBarActions
          activeTab={activeTab}
          project_id={project_id}
          path={path}
        />
      </div>
    </div>
  );
}

// All possible Actions of files. TODO: should they have a common parent?!
type EditorAction =
  | ArchiveActions
  | CodeEditorActions
  | ChatActions
  | CourseActions;

function TopTabBarActions(props: Readonly<TTBAProps & { path: string }>) {
  const { activeTab, project_id, path } = props;
  const isMounted = useIsMountedRef();
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<EditorAction | null>(null);
  const [topBarActions, setTopBarActions] = useState<TopBarActions | null>(
    null
  );

  useAsyncEffect(async () => {
    setActions(null); // to avoid calling wrong actions
    for (let i = 0; i < 100; i++) {
      if (!isMounted.current) return;
      const actions = await redux.getEditorActions(project_id, path);
      if (actions != null) {
        setLoading(false);
        setTopBarActions(actions.getTopBarActions?.());
        setActions(actions);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, [project_id, path]);

  console.debug("topBarActions", topBarActions);

  if (loading) {
    return <Loading style={{ color: COLORS.GRAY_M, padding: "8px 10px" }} />;
  } else {
    return (
      <>
        <ChatIndicatorTab activeTab={activeTab} project_id={project_id} />
        <ShareIndicatorTab activeTab={activeTab} project_id={project_id} />
        <TopBarSaveButton
          project_id={project_id}
          path={path}
          actions={actions}
        />
        <CloseEditor activeTab={activeTab} project_id={project_id} />
      </>
    );
  }
}

interface TopBarSaveButtonProps {
  project_id: string;
  path: string;
  actions: EditorAction | null;
}

function TopBarSaveButton({
  project_id,
  path,
  actions,
}: TopBarSaveButtonProps): JSX.Element | null {
  const name = redux_name(project_id, path);

  const read_only: boolean = useRedux([name, "read_only"]);
  const has_unsaved_changes: boolean = useRedux([name, "has_unsaved_changes"]);
  const has_uncommitted_changes: boolean = useRedux([
    name,
    "has_uncommitted_changes",
  ]);
  const show_uncommitted_changes: boolean = useRedux([
    name,
    "show_uncommitted_changes",
  ]);
  const is_saving: boolean = useRedux([name, "is_saving"]);
  const is_public: boolean = useRedux([name, "is_public"]);

  if (actions == null) return null;

  const isChat = actions instanceof ChatActions;
  const isArchive = actions instanceof ArchiveActions;
  const isCourse = actions instanceof CourseActions;
  // actions instanceof CodeEditorActions causes strange exception
  const isCodeEditor =
    !isCourse &&
    !isArchive &&
    !isChat &&
    actions.set_show_uncommitted_changes != null;

  return (
    <SaveButton
      has_unsaved_changes={has_unsaved_changes}
      has_uncommitted_changes={has_uncommitted_changes}
      show_uncommitted_changes={show_uncommitted_changes}
      set_show_uncommitted_changes={
        isCodeEditor ? actions.set_show_uncommitted_changes : undefined
      }
      read_only={read_only}
      is_public={is_public}
      is_saving={is_saving}
      no_labels={false}
      size={24}
      style={{}}
      onClick={() => {
        if (isChat) {
          actions.save_to_disk();
        } else if (isCodeEditor) {
          actions.save(true);
          actions.explicit_save();
        }
      }}
    />
  );
}

function CloseEditor({ activeTab, project_id }): JSX.Element | null {
  const isMounted = useIsMountedRef();
  const actions = useActions({ project_id });

  async function handleOnClick(e: React.MouseEvent) {
    e.preventDefault();
    const path = tab_to_path(activeTab);
    if (path == null) return;
    try {
      if (path.endsWith(".ipynb")) {
        const jupyter_actions = await getJupyterActions({ project_id, path });
        if (!isMounted.current) return;
        if (jupyter_actions != null) {
          jupyter_actions.halt();
        }
      }
    } catch (err) {
      console.error("Problem stopping jupyter kernel, ignoring", err);
    }
    actions?.close_tab(path); // this unmounts the top actions including this close button
  }

  return (
    <Tooltip title={<>Close Editor</>}>
      <AntdButton onClick={handleOnClick} icon={<Icon name="hand-stop" />} />
    </Tooltip>
  );
}

function ChatIndicatorTab({ activeTab, project_id }): JSX.Element | null {
  if (!activeTab?.startsWith("editor-")) {
    // TODO: This is the place in the code where we could support project-wide
    // side chat, or side chats for each individual Files/Search, etc. page.
    return null;
  }
  const path = tab_to_path(activeTab);
  if (path == null) {
    // bug -- tab is not a file tab.
    return null;
  }
  return (
    <>
      <UsersViewing
        project_id={project_id}
        path={path}
        style={{ maxWidth: "120px" }}
      />
      <ChatButton project_id={project_id} path={path} />
    </>
  );
}

function ShareIndicatorTab({ activeTab, project_id }) {
  const isAnonymous = useTypedRedux("account", "is_anonymous");
  const currentPath = useTypedRedux({ project_id }, "current_path");

  if (isAnonymous) {
    // anon users can't share anything
    return null;
  }

  const path = activeTab === "files" ? currentPath : tab_to_path(activeTab);

  if (path == null) {
    // nothing specifically to share
    return null;
  }

  if (path === "") {
    // sharing whole project not implemented
    return null;
  }

  return <ShareIndicator project_id={project_id} path={path} />;
}
