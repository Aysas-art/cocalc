/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
FrameTitleBar - title bar in a frame, in the frame tree
*/

import {
  Button as AntdButton0,
  Input,
  InputNumber,
  Popconfirm,
  Popover,
  Tooltip,
} from "antd";
import { List } from "immutable";
import { debounce } from "lodash";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Button as AntdBootstrapButton,
  ButtonGroup,
  ButtonStyle,
} from "@cocalc/frontend/antd-bootstrap";
import {
  CSS,
  React,
  redux,
  Rendered,
  useForceUpdate,
  useRedux,
  useState,
} from "@cocalc/frontend/app-framework";
import {
  DropdownMenu,
  Icon,
  IconName,
  MenuItems,
  r_join,
  Gap,
  VisibleMDLG,
} from "@cocalc/frontend/components";
import { useStudentProjectFunctionality } from "@cocalc/frontend/course";
import { EditorFileInfoDropdown } from "@cocalc/frontend/editors/file-info-dropdown";
import { IS_MACOS } from "@cocalc/frontend/feature";
import { capitalize, copy, path_split, trunc_middle } from "@cocalc/util/misc";
import { Actions } from "../code-editor/actions";
import { FORMAT_SOURCE_ICON } from "../frame-tree/config";
import { is_safari } from "../generic/browser";
import { get_default_font_size } from "../generic/client";
import { SaveButton } from "./save-button";
import { ConnectionStatus, EditorDescription, EditorSpec } from "./types";
import { undo as chatUndo, redo as chatRedo } from "../generic/chat";
import ChatGPT from "../chatgpt/title-bar-button";
import userTracking from "@cocalc/frontend/user-tracking";
import TitleBarTour from "./title-bar-tour";
import { IS_MOBILE } from "@cocalc/frontend/feature";

// Certain special frame editors (e.g., for latex) have extra
// actions that are not defined in the base code editor actions.
// In all cases, we check these are actually defined before calling
// them to avoid a runtime stacktrace.
interface FrameActions extends Actions {
  zoom_page_width?: (id: string) => void;
  zoom_page_height?: (id: string) => void;
  sync?: (id: string, editor_actions: EditorActions) => void;
  show_table_of_contents?: (id: string) => void;
  build?: (id: string, boolean) => void;
  force_build?: (id: string) => void;
  clean?: (id: string) => void;
  word_count?: (time: number, force: boolean) => void;
  close_and_halt?: (id: string) => void;
}

interface EditorActions extends Actions {
  download?: (id: string) => void;
  restart?: () => void;
  rescan_latex_directive?: () => void;
  halt_jupyter?: () => void;
}

import { AvailableFeatures } from "@cocalc/frontend/project_configuration";
import { COLORS } from "@cocalc/util/theme";

const COL_BAR_BACKGROUND = "#f8f8f8";
const COL_BAR_BACKGROUND_DARK = "#ddd";
const COL_BAR_BORDER = "rgb(204,204,204)";

const title_bar_style: CSS = {
  background: COL_BAR_BACKGROUND_DARK,
  border: `1px solid ${COL_BAR_BORDER}`,
  padding: "1px",
  flexDirection: "row",
  flexWrap: "nowrap",
  flex: "0 0 auto",
  display: "flex",
} as const;

const MAX_TITLE_WIDTH = 25;

const TITLE_STYLE: CSS = {
  background: COL_BAR_BACKGROUND,
  margin: "5px",
  fontSize: "10pt",
  whiteSpace: "nowrap",
  display: "inline-block",
  maxWidth: `${MAX_TITLE_WIDTH + 2}ex`,
} as const;

const CONNECTION_STATUS_STYLE: CSS = {
  padding: "5px 5px 0 5px",
  fontSize: "10pt",
  float: "right",
} as const;

function connection_status_color(status: ConnectionStatus): string {
  switch (status) {
    case "disconnected":
      return "rgb(255, 0, 0)";
    case "connecting":
      return "rgb(255, 165, 0)";
    case "connected":
      return "#666";
    default:
      return "rgb(255, 165, 0)";
  }
}

export function ConnectionStatusIcon({ status }: { status: ConnectionStatus }) {
  return (
    <Icon
      style={{
        color: connection_status_color(status),
      }}
      name={"wifi"}
    />
  );
}

const ICON_STYLE: CSS = {
  width: "20px",
  display: "inline-block",
} as const;

interface Props {
  actions: FrameActions;
  editor_actions: EditorActions;
  path: string;
  project_id: string; // assumed to not change for now
  active_id: string;
  id: string;
  is_full?: boolean;
  is_only?: boolean; // is the only frame
  is_public?: boolean; // public view of a file
  is_paused?: boolean;
  type: string;
  spec: EditorDescription;
  editor_spec: EditorSpec;
  status: string;
  title?: string;
  connection_status?: ConnectionStatus;
  font_size?: number;
  available_features?: AvailableFeatures;
  page?: number | string;
  pages?: number | List<string>;
  is_visible?: boolean;
  tab_is_visible?: boolean;
}

export const FrameTitleBar: React.FC<Props> = (props: Props) => {
  const is_active = props.active_id === props.id;
  const track = useMemo(() => {
    const { project_id, path } = props;
    return (action: string) => {
      userTracking("frame-tree", {
        project_id,
        path,
        action,
        type: props.type,
      });
    };
  }, [props.project_id, props.path]);
  const buttons_ref = useRef<
    { [button_name: string]: true } | null | undefined
  >(null);

  const force_update = useForceUpdate();

  const [showMainButtonsPopover, setShowMainButtonsPopover] =
    useState<boolean>(false);

  useEffect(() => {
    // clear button cache whenever type changes; otherwise,
    // the buttons at the top wouldn't change.
    buttons_ref.current = null;
    force_update();
  }, [props.type]);

  const [close_and_halt_confirm, set_close_and_halt_confirm] =
    useState<boolean>(false);

  const student_project_functionality = useStudentProjectFunctionality(
    props.project_id
  );

  if (props.editor_actions?.name == null) {
    throw Error("editor_actions must have name attribute");
  }
  if (props.actions.name == null) {
    throw Error("actions must have name attribute");
  }

  // REDUX:
  // state that is associated with the file being edited, not the
  // frame tree/tab in which this sits.  Note some more should
  // probably be moved down here...

  // These come from editor_actions's store:
  const read_only: boolean = useRedux([props.editor_actions.name, "read_only"]);
  const has_unsaved_changes: boolean = useRedux([
    props.editor_actions.name,
    "has_unsaved_changes",
  ]);
  const has_uncommitted_changes: boolean = useRedux([
    props.editor_actions.name,
    "has_uncommitted_changes",
  ]);
  const show_uncommitted_changes: boolean = useRedux([
    props.editor_actions.name,
    "show_uncommitted_changes",
  ]);
  const is_saving: boolean = useRedux([props.editor_actions.name, "is_saving"]);
  const is_public: boolean = useRedux([props.editor_actions.name, "is_public"]);
  const fullscreen: undefined | "default" | "kiosk" = useRedux(
    "page",
    "fullscreen"
  );

  const hideButtonTooltips = useRedux(["account", "other_settings"]).get(
    "hide_button_tooltips"
  );

  const disableTourRefs = useRef<boolean>(false);
  const tourRefs = useRef<{ [name: string]: { current: any } }>({});
  const getTourRef = (name: string) => {
    if (disableTourRefs.current) return null;
    if (tourRefs.current[name] == null) {
      tourRefs.current[name] = { current: null };
    }
    return tourRefs.current[name];
  };
  const tours = useRedux(["account", "tours"]);
  const hasTour = useMemo(() => {
    if (IS_MOBILE || !is_visible("tour", true)) {
      return false;
    }
    if (tours?.includes("all") || tours?.includes(`frame-${props.type}`)) {
      return false;
    }
    return true;
  }, [tours, props.type]);

  // comes from actions's store:
  const switch_to_files: List<string> = useRedux([
    props.actions.name,
    "switch_to_files",
  ]);

  function button_height(): string {
    return props.is_only || props.is_full ? "34px" : "30px";
  }

  function button_style(style?: CSS): CSS {
    return {
      ...style,
      ...{ height: button_height(), marginBottom: "5px" },
    };
  }

  function wrapOnClick(props1, props0) {
    if (props0.onClick != null) {
      props1.onClick = async (...args) => {
        try {
          await props0.onClick(...args);
        } catch (err) {
          console.trace(`${err}`);
          props.actions.set_error(
            `${err}. Try reopening this file, refreshing your browser, or restarting your project.  If nothing works, click Help above and make a support request.`
          );
        }
      };
    }
  }

  function StyledButton(props0) {
    let props1;
    if (hideButtonTooltips) {
      props1 = { ...props0 };
      delete props1.title;
    } else {
      props1 = { ...props0 };
    }
    wrapOnClick(props1, props0);
    return (
      <AntdBootstrapButton {...props1} style={button_style(props1.style)}>
        {props1.children}
      </AntdBootstrapButton>
    );
  }

  function Button(props) {
    return <StyledButton {...props}>{props.children}</StyledButton>;
  }

  function AntdButton(props0) {
    const props1 = { ...props0 };
    wrapOnClick(props1, props0);
    return <AntdButton0 {...props1} />;
  }
  AntdButton.Group = AntdButton0.Group;

  function is_visible(action_name: string, explicit?: boolean): boolean {
    if (props.editor_actions[action_name] == null) {
      return false;
    }
    if (isExplicitlyHidden(action_name)) {
      return false;
    }

    if (buttons_ref.current == null) {
      if (!explicit) {
        return true;
      }
      let buttons = props.spec.buttons ?? {};
      buttons_ref.current =
        typeof buttons == "function" ? buttons(props.path) : buttons;
    }

    return !!buttons_ref.current?.[action_name];
  }

  function isExplicitlyHidden(actionName: string): boolean {
    return !!props.spec.buttons?.[`-${actionName}`];
  }

  function click_close(): void {
    props.actions.close_frame(props.id);
  }

  function button_size(): "small" | undefined {
    if (props.is_only || props.is_full) {
      return;
    } else {
      return "small";
    }
  }

  function render_x(): Rendered {
    return (
      <StyledButton
        title={"Close this frame"}
        key={"close"}
        bsSize={button_size()}
        onClick={click_close}
      >
        <Icon name={"times"} />
      </StyledButton>
    );
  }

  function select_type(type: string): void {
    props.actions.set_frame_type(props.id, type);
  }

  function render_types(): Rendered {
    const selected_type: string = props.type;
    let selected_icon: IconName | undefined = undefined;
    let selected_short = "";
    const items: MenuItems = [];
    for (const type in props.editor_spec) {
      const spec = props.editor_spec[type];
      if (spec == null) {
        // typescript should prevent this but, also double checking
        // makes this easier to debug.
        console.log(props.editor_spec);
        throw Error(
          `BUG -- ${type} must be defined by the editor_spec, but is not`
        );
      }
      if (is_public && spec.hide_public) {
        // editor that is explicitly excluded from public view for file,
        // e.g., settings or terminal might use this.
        continue;
      }
      if (selected_type === type) {
        selected_icon = spec.icon;
        selected_short = spec.short;
      }
      items.push({
        key: type,
        label: (
          <>
            <Icon name={spec.icon ? spec.icon : "file"} style={ICON_STYLE} />{" "}
            {spec.name}
          </>
        ),
        onClick: () => select_type(type),
      });
    }

    let title;
    if (selected_short) {
      title = (
        <span cocalc-test={"short-" + selected_short}>
          <Icon name={selected_icon} style={{ marginRight: "5px" }} />
          {title} {selected_short}
        </span>
      );
    } else if (selected_icon != null) {
      title = <Icon name={selected_icon} />;
    }

    // TODO: The "float: left" below is a hack
    // to workaround that this is still in a bootstrap button group.
    return (
      <DropdownMenu
        key="types"
        cocalc-test={"types-dropdown"}
        button={true}
        style={{
          float: "left",
          height: button_height(),
          marginBottom: "5px",
          marginRight: "3px",
        }}
        title={title}
        items={items}
      />
    );
  }

  function render_control(): Rendered {
    const style: CSS = {
      padding: 0,
      background: is_active ? COL_BAR_BACKGROUND : COL_BAR_BACKGROUND_DARK,
      height: button_height(),
      float: "right",
    };
    return (
      <div
        key="control"
        style={{
          overflow: "hidden",
          display: "inline-block",
          opacity: is_active ? undefined : 0.5,
        }}
        ref={getTourRef("control")}
      >
        <ButtonGroup style={style} key={"close"}>
          {!props.is_full ? render_split_row() : undefined}
          {!props.is_full ? render_split_col() : undefined}
          {!props.is_only ? render_full() : undefined}
          {render_x()}
        </ButtonGroup>
        {render_types()}
      </div>
    );
  }

  function render_full(): Rendered {
    if (props.is_full) {
      return (
        <StyledButton
          disabled={props.is_only}
          title={"Show all frames"}
          key={"compress"}
          bsSize={button_size()}
          onClick={() => {
            track("unset-full");
            props.actions.unset_frame_full();
          }}
          bsStyle={"warning"}
        >
          <Icon name={"compress"} />
        </StyledButton>
      );
    } else {
      return (
        <StyledButton
          disabled={props.is_only}
          key={"expand"}
          title={"Show only this frame"}
          bsSize={button_size()}
          onClick={() => {
            track("set-full");
            props.actions.set_frame_full(props.id);
          }}
        >
          <Icon name={"expand"} />
        </StyledButton>
      );
    }
  }
  function render_split_row(): Rendered {
    return (
      <StyledButton
        key={"split-row"}
        title={"Split frame horizontally into two rows"}
        bsSize={button_size()}
        onClick={(e) => {
          e.stopPropagation();
          if (props.is_full) {
            track("unset-full");
            return props.actions.unset_frame_full();
          } else {
            track("split-row");
            return props.actions.split_frame("row", props.id);
          }
        }}
      >
        <Icon name="horizontal-split" />
      </StyledButton>
    );
  }

  function render_split_col(): Rendered {
    return (
      <StyledButton
        key={"split-col"}
        title={"Split frame vertically into two columns"}
        bsSize={button_size()}
        onClick={(e) => {
          e.stopPropagation();
          if (props.is_full) {
            track("unset-full");
            return props.actions.unset_frame_full();
          } else {
            track("split-col");
            return props.actions.split_frame("col", props.id);
          }
        }}
      >
        <Icon name="vertical-split" />
      </StyledButton>
    );
  }

  function render_zoom_out(): Rendered {
    if (!is_visible("decrease_font_size", true)) {
      return;
    }
    return (
      <StyledButton
        key={"font-increase"}
        title={"Decrease font size (control + <)"}
        bsSize={button_size()}
        onClick={() => props.actions.decrease_font_size(props.id)}
      >
        <Icon name={"search-minus"} />
      </StyledButton>
    );
  }

  function render_zoom_in(): Rendered {
    if (!is_visible("increase_font_size", true)) {
      return;
    }
    return (
      <StyledButton
        key={"font-decrease"}
        title={"Increase font size (control + >)"}
        onClick={() => props.actions.increase_font_size(props.id)}
        bsSize={button_size()}
      >
        <Icon name={"search-plus"} />
      </StyledButton>
    );
  }

  function render_set_zoom(): Rendered {
    if (!is_visible("set_zoom", true)) {
      return;
    }

    const items: MenuItems = [50, 85, 100, 115, 125, 150, 200].map((zoom) => {
      return {
        key: `${zoom}`,
        label: `${zoom}%`,
        onClick: () => {
          props.actions.set_zoom(zoom / 100, props.id);
        },
      };
    });

    const title =
      props.font_size == null
        ? "Zoom"
        : `${Math.round((100 * props.font_size) / get_default_font_size())}%`;

    return (
      <DropdownMenu
        key={"zoom-levels"}
        button={true}
        title={title}
        style={{ height: button_height() }}
        items={items}
      />
    );
  }

  function render_zoom_page_width(): Rendered {
    return (
      <StyledButton
        key={"text-width"}
        title={"Zoom to page width"}
        bsSize={button_size()}
        onClick={() => props.actions.zoom_page_width?.(props.id)}
      >
        <Icon name={"ColumnWidthOutlined"} />
      </StyledButton>
    );
  }

  function render_zoom_page_height(): Rendered {
    return (
      <StyledButton
        key={"text-height"}
        title={"Zoom to page height"}
        bsSize={button_size()}
        onClick={() => props.actions.zoom_page_height?.(props.id)}
      >
        <Icon name={"ColumnHeightOutlined"} />
      </StyledButton>
    );
  }

  function render_sync(labels): Rendered {
    if (!is_visible("sync") || props.actions.sync == null) {
      return;
    }
    return (
      <StyledButton
        key={"sync"}
        title={`Synchronize views (${IS_MACOS ? "⌘" : "Alt"} + Enter)`}
        bsSize={button_size()}
        onClick={() => props.actions.sync?.(props.id, props.editor_actions)}
      >
        <Icon name="sync" />{" "}
        {labels ? <VisibleMDLG>Sync</VisibleMDLG> : undefined}
      </StyledButton>
    );
  }

  function render_switch_to_file(): Rendered {
    if (
      !is_visible("switch_to_file") ||
      props.actions.switch_to_file == null ||
      switch_to_files == null ||
      switch_to_files.size <= 1
    ) {
      return;
    }

    const items: MenuItems = switch_to_files.toJS().map((path) => {
      return {
        key: path,
        label: (
          <>
            {props.path == path ? <b>{path}</b> : path}
            {props.actions.path == path ? " (main)" : ""}
          </>
        ),
        onClick: () => props.actions.switch_to_file(path, props.id),
      };
    });

    return (
      <DropdownMenu
        key={"switch-to-file"}
        button={true}
        style={{
          height: button_height(),
        }}
        title={path_split(props.path).tail}
        items={items}
      />
    );
  }

  function render_download(labels): Rendered {
    if (
      !is_visible("download") ||
      props.editor_actions.download == null ||
      student_project_functionality.disableActions
    ) {
      return;
    }
    return (
      <StyledButton
        key={"download"}
        title={"Download this file"}
        bsSize={button_size()}
        onClick={() => props.editor_actions.download?.(props.id)}
      >
        <Icon name={"cloud-download"} />{" "}
        {labels ? <VisibleMDLG>Download</VisibleMDLG> : undefined}
      </StyledButton>
    );
  }

  function render_replace(): Rendered {
    if (!is_visible("replace")) {
      return;
    }
    return (
      <StyledButton
        key={"replace"}
        title={"Replace text"}
        onClick={() => props.editor_actions.replace(props.id)}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name="replace" />
      </StyledButton>
    );
  }

  function render_find(): Rendered {
    if (!is_visible("find")) {
      return;
    }
    return (
      <StyledButton
        key={"find"}
        title={"Find text"}
        onClick={() => props.editor_actions.find(props.id)}
        bsSize={button_size()}
      >
        <Icon name="search" />
      </StyledButton>
    );
  }

  function render_goto_line(): Rendered {
    if (!is_visible("goto_line")) {
      return;
    }
    return (
      <StyledButton
        key={"goto-line"}
        title={"Jump to line"}
        onClick={() => props.editor_actions.goto_line(props.id)}
        bsSize={button_size()}
      >
        <Icon name="bolt" />
      </StyledButton>
    );
  }

  function render_find_replace_group(): Rendered {
    const v: Rendered[] = [];
    let x: Rendered;
    x = render_find();
    if (x) {
      v.push(x);
    }
    if (!is_public) {
      x = render_replace();
      if (x) {
        v.push(x);
      }
    }
    x = render_goto_line();
    if (x) {
      v.push(x);
    }
    if (v.length > 0) {
      return <ButtonGroup key={"find-group"}>{v}</ButtonGroup>;
    }
  }

  function render_cut(): Rendered {
    if (!is_visible("cut")) {
      return;
    }
    return (
      <StyledButton
        key={"cut"}
        title={"Cut selected"}
        onClick={() => props.editor_actions.cut(props.id)}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name={"scissors"} />
      </StyledButton>
    );
  }

  function render_paste(): Rendered {
    if (!is_visible("paste")) {
      return;
    }
    return (
      <StyledButton
        key={"paste"}
        title={"Paste buffer"}
        onClick={debounce(
          () => props.editor_actions.paste(props.id, true),
          200,
          { leading: true, trailing: false }
        )}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name={"paste"} />
      </StyledButton>
    );
  }

  function render_copy(): Rendered {
    if (!is_visible("copy")) {
      return;
    }
    return (
      <StyledButton
        key={"copy"}
        title={"Copy selected"}
        onClick={() => props.editor_actions.copy(props.id)}
        bsSize={button_size()}
      >
        <Icon name={"copy"} />
      </StyledButton>
    );
  }

  function render_copy_group(): Rendered {
    const v: Rendered[] = [];
    let x: Rendered;
    if (!is_public) {
      x = render_cut();
      if (x) {
        v.push(x);
      }
    }
    if (is_visible("copy")) {
      v.push(render_copy());
    }
    if (!is_public) {
      x = render_paste();
      if (x) {
        v.push(x);
      }
    }
    if (v.length > 0) {
      return (
        <div
          key="copy"
          ref={getTourRef("copy")}
          style={{ display: "inline-block" }}
        >
          <ButtonGroup>{v}</ButtonGroup>
        </div>
      );
    }
  }

  function render_zoom_group(): Rendered {
    return (
      <div
        key="zoom"
        ref={getTourRef("zoom")}
        style={{ display: "inline-block" }}
      >
        <AntdButton.Group>
          {render_set_zoom()}
          {render_zoom_out()}
          {render_zoom_in()}
        </AntdButton.Group>
      </div>
    );
  }

  function render_page_width_height_group(): Rendered {
    const v: ReactNode[] = [];
    if (
      is_visible("zoom_page_height") &&
      props.actions.zoom_page_height != null
    ) {
      v.push(render_zoom_page_height());
    }
    if (
      is_visible("zoom_page_width") &&
      props.actions.zoom_page_width != null
    ) {
      v.push(render_zoom_page_width());
    }
    if (v.length == 2) {
      return <ButtonGroup key={"height-width"}>{v}</ButtonGroup>;
    }
    if (v.length == 1) {
      return <span key={"height-width"}>{v}</span>;
    }
  }

  function render_undo(): Rendered {
    if (!is_visible("undo")) {
      return;
    }
    return (
      <Button
        key={"undo"}
        title={"Undo last thing you did"}
        onClick={() => {
          if (props.type == "chat") {
            // we have to special case this until we come up with a better way of having
            // different kinds of actions for other frames.
            chatUndo(props.project_id, props.path);
          } else {
            props.editor_actions.undo(props.id);
          }
        }}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name="undo" />
      </Button>
    );
  }

  function render_redo(): Rendered {
    if (!is_visible("redo")) {
      return;
    }
    return (
      <Button
        key={"redo"}
        title={"Redo last thing you undid"}
        onClick={() => {
          if (props.type == "chat") {
            // see undo comment above
            chatRedo(props.project_id, props.path);
          } else {
            props.editor_actions.redo(props.id);
          }
        }}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name="repeat" />
      </Button>
    );
  }

  function render_undo_redo_group(): Rendered {
    const v: Rendered[] = [];
    let x: Rendered;
    if ((x = render_undo())) v.push(x);
    if ((x = render_redo())) v.push(x);
    if (v.length > 0) {
      return <ButtonGroup key={"undo-group"}>{v}</ButtonGroup>;
    }
  }

  function render_format_group(): Rendered {
    if (!is_visible("auto_indent")) {
      return;
    }
    return (
      <Button
        key={"auto-indent"}
        title={"Automatically format selected code"}
        onClick={() => props.editor_actions.auto_indent(props.id)}
        disabled={read_only}
        bsSize={button_size()}
      >
        <Icon name="indent" />
      </Button>
    );
  }

  function show_labels(): boolean {
    return !!(props.is_only || props.is_full);
  }

  function button_text(
    button_name: string,
    labels?: boolean
  ): string | undefined {
    if (!labels) return;
    const custom = props.editor_spec[props.type].customize_buttons;
    if (custom != null) {
      const x = custom[button_name];
      if (x != null && x.text != null) {
        return x.text;
      }
    }
    return capitalize(button_name);
  }

  function button_title(button_name: string, def?: string): string | undefined {
    const custom = props.editor_spec[props.type].customize_buttons;
    if (custom != null) {
      const x = custom[button_name];
      if (x != null && x.title != null) {
        return x.title;
      }
    }
    if (def != undefined) {
      return def;
    }
    return;
  }

  function render_timetravel(labels): Rendered {
    if (!is_visible("time_travel")) {
      return;
    }
    return (
      <AntdButton
        key={"timetravel"}
        title={"Show edit history"}
        style={{ ...button_style(), color: "white", background: "#5bc0de" }}
        size={button_size()}
        onClick={(event) => {
          track("time-travel");
          if (props.actions.name != props.editor_actions.name) {
            // a subframe editor -- always open time travel in a name tab.
            props.editor_actions.time_travel({ frame: false });
            return;
          }
          // If a time_travel frame type is available and the
          // user does NOT shift+click, then open as a frame.
          // Otherwise, it opens as a new tab.
          const frame =
            !event.shiftKey && props.editor_spec["time_travel"] != null;
          props.actions.time_travel({
            frame,
          });
        }}
      >
        <Icon name="history" />
        <VisibleMDLG>{labels ? " TimeTravel" : undefined}</VisibleMDLG>
      </AntdButton>
    );
  }

  function render_chatgpt(labels): Rendered {
    if (
      !is_visible("chatgpt") ||
      !redux.getStore("projects").hasOpenAI(props.project_id)
    ) {
      return;
    }
    return (
      <ChatGPT
        buttonRef={getTourRef("chatgpt")}
        key={"chatgpt"}
        id={props.id}
        actions={props.actions}
        path={props.path}
        buttonSize={button_size()}
        buttonStyle={{
          ...button_style(),
          backgroundColor: "rgb(16, 163, 127)",
          color: "white",
        }}
        labels={labels}
        visible={props.tab_is_visible && props.is_visible}
      />
    );
  }

  function render_tour(labels): Rendered {
    if (!hasTour) {
      return;
    }
    return (
      <AntdButton
        type="primary"
        key={"tour"}
        title={"Take the tour!"}
        size={button_size()}
        onClick={() => {
          track("tour");
          userTracking("tour", { name: `frame-${props.type}` });
          props.actions.set_frame_full(props.id);
          // we have to wait until the frame renders before
          // setting the tour; otherwise, the references won't
          // be defined and it won't work.
          setTimeout(
            () => props.actions.set_frame_tree({ id: props.id, tour: true }),
            1
          );
        }}
        style={{ border: "1px solid rgb(217, 217, 217)", ...button_style() }}
      >
        <div ref={getTourRef("tour")} style={{ display: "inline-block" }}>
          <Icon name="map" />
          <VisibleMDLG>{labels ? " Tour" : undefined}</VisibleMDLG>
        </div>
      </AntdButton>
    );
  }

  function render_reload(labels): Rendered {
    if (!is_visible("reload", true)) {
      return;
    }
    return (
      <Button
        key={"reload"}
        title={"Reload this file"}
        bsSize={button_size()}
        onClick={() => props.actions.reload(props.id)}
      >
        <Icon name="reload" />
        <VisibleMDLG>{labels ? " Reload" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_help(labels: boolean): Rendered {
    if (!is_visible("help", true) || is_public) {
      return;
    }
    return (
      <div
        key="help"
        ref={getTourRef("help")}
        style={{ display: "inline-block" }}
      >
        <Button
          title={"Show documentation for working with this editor"}
          bsSize={button_size()}
          onClick={() =>
            typeof props.actions.help === "function"
              ? props.actions.help(props.type)
              : undefined
          }
        >
          <Icon name="question-circle" />{" "}
          <VisibleMDLG>{labels ? "Docs…" : undefined}</VisibleMDLG>
        </Button>
      </div>
    );
  }

  function render_guide(labels: boolean): Rendered {
    if (!is_visible("guide", true) || is_public) {
      return;
    }
    const { title, descr, icon } = {
      ...{
        title: "Guide",
        descr: "Show guidebook",
        icon: "magic" as IconName,
      },
      ...props.editor_spec[props.type].guide_info,
    };
    return (
      <div
        key="guide"
        ref={getTourRef("guide")}
        style={{ display: "inline-block" }}
      >
        <Button
          title={descr}
          bsSize={button_size()}
          onClick={() => {
            if (typeof props.actions.help === "function") {
              props.actions.guide(props.id, props.type);
              track("guide");
            }
          }}
        >
          <Icon name={icon} />{" "}
          <VisibleMDLG>{labels ? title : undefined}</VisibleMDLG>
        </Button>
      </div>
    );
  }

  function render_restart(labels): Rendered {
    if (!is_visible("restart", true)) {
      return;
    }
    return (
      <Button
        key={"restart"}
        title={"Restart service"}
        bsSize={button_size()}
        onClick={() => props.editor_actions.restart?.()}
      >
        <Icon name="sync" />{" "}
        {labels ? <VisibleMDLG>Restart</VisibleMDLG> : undefined}
      </Button>
    );
  }

  function render_save(labels: boolean): Rendered {
    if (!is_visible("save", true)) {
      return;
    }
    return (
      <SaveButton
        key="save"
        has_unsaved_changes={has_unsaved_changes}
        has_uncommitted_changes={has_uncommitted_changes}
        show_uncommitted_changes={show_uncommitted_changes}
        set_show_uncommitted_changes={
          props.editor_actions.set_show_uncommitted_changes
        }
        read_only={read_only}
        is_public={is_public}
        is_saving={is_saving}
        no_labels={!labels}
        size={button_size()}
        style={button_style()}
        onClick={() => {
          props.editor_actions.save(true);
          props.actions.explicit_save();
          props.actions.focus(props.id);
        }}
      />
    );
  }

  function render_save_timetravel_group(labels): Rendered {
    const v: Rendered[] = [];
    let x: Rendered;
    if ((x = render_tour(labels))) v.push(x);
    if ((x = render_save(labels))) v.push(x);
    if (!is_public) {
      if ((x = render_timetravel(labels))) v.push(x);
    }
    if ((x = render_chatgpt(labels))) v.push(x);
    if ((x = render_reload(labels))) v.push(x);
    if (v.length == 1) return v[0];
    if (v.length > 0) {
      return <ButtonGroup key={"save-group"}>{v}</ButtonGroup>;
    }
  }

  function render_format(labels): Rendered {
    if (
      !is_visible("format") ||
      !props.editor_actions.has_format_support(
        props.id,
        props.available_features
      )
    ) {
      return;
    }
    return (
      <Button
        key={"format"}
        bsSize={button_size()}
        onClick={() => props.editor_actions.format(props.id)}
        title={"Syntactically format the document."}
      >
        <Icon name={FORMAT_SOURCE_ICON} />{" "}
        <VisibleMDLG>{labels ? "Format" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_table_of_contents(labels): Rendered {
    if (!is_visible("show_table_of_contents")) return;
    return (
      <Button
        key={"contents"}
        bsSize={button_size()}
        onClick={() => {
          track("table-of-contents");
          props.actions.show_table_of_contents?.(props.id);
        }}
        title={"Show the Table of Contents"}
      >
        <Icon name={"align-right"} />{" "}
        <VisibleMDLG>{labels ? "Contents" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_show_pages(labels): Rendered {
    if (!is_visible("show_pages")) return;
    return (
      <Button
        key={"pages"}
        bsSize={button_size()}
        onClick={() => props.actions.show_pages?.(props.id)}
        title={"Show Pages"}
      >
        <Icon name={"pic-centered"} />{" "}
        <VisibleMDLG>{labels ? "Pages" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_show_overview(labels): Rendered {
    if (!is_visible("show_overview")) return;
    return (
      <Button
        key={"overview"}
        bsSize={button_size()}
        onClick={() => props.actions.show_overview?.(props.id)}
        title={"Show Overview of all Pages"}
      >
        <Icon name={"overview"} />{" "}
        <VisibleMDLG>{labels ? "Overview" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_show_slideshow(labels): Rendered {
    if (!is_visible("show_slideshow")) return;
    return (
      <Button
        key={"slideshow"}
        bsSize={button_size()}
        onClick={() => props.actions.show_slideshow?.(props.id)}
        title={"Display Slideshow Presentation"}
      >
        <Icon name={"play-square"} />{" "}
        <VisibleMDLG>{labels ? "Slideshow" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_show_speaker_notes(labels): Rendered {
    if (!is_visible("show_speaker_notes")) return;
    return (
      <Button
        key={"speaker_notes"}
        bsSize={button_size()}
        onClick={() => props.actions.show_speaker_notes?.(props.id)}
        title={"Show Speaker Notes"}
      >
        <Icon name={"pencil"} />{" "}
        <VisibleMDLG>{labels ? "Speaker" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_show_search(labels): Rendered {
    if (!is_visible("show_search")) return;
    return (
      <Button
        key={"search"}
        bsSize={button_size()}
        onClick={() => props.actions.show_search?.(props.id)}
        title={"Show Search"}
      >
        <Icon name={"search"} />{" "}
        <VisibleMDLG>{labels ? "Search" : undefined}</VisibleMDLG>
      </Button>
    );
  }
  function render_build(): Rendered {
    if (!is_visible("build", true)) {
      return;
    }
    const title =
      "Build (disable automatic builds in Account → Editor → 'Build on save')";
    return (
      <Button
        key={"build"}
        disabled={!!props.status}
        bsSize={button_size()}
        onClick={() => props.actions.build?.(props.id, false)}
        title={title}
      >
        <Icon name={"play-circle"} /> <VisibleMDLG>Build</VisibleMDLG>
      </Button>
    );
  }

  function render_force_build(): Rendered {
    if (!is_visible("force_build", true)) {
      return;
    }
    return (
      <Button
        key={"force-build"}
        disabled={!!props.status}
        bsSize={button_size()}
        onClick={() => props.actions.force_build?.(props.id)}
        title={"Force rebuild entire project"}
      >
        <Icon name={"play"} /> <VisibleMDLG>Force Rebuild</VisibleMDLG>
      </Button>
    );
  }

  function render_rescan_latex_directives(): Rendered {
    if (!is_visible("rescan_latex_directive", true)) return;
    return (
      <Button
        key={"rescan-latex-directive"}
        disabled={!!props.status}
        bsSize={button_size()}
        onClick={() => props.editor_actions.rescan_latex_directive?.()}
        title={"Rescan document for build directive"}
      >
        <Icon name={"reload"} /> <VisibleMDLG>Directive</VisibleMDLG>
      </Button>
    );
  }

  function render_clean(labels): Rendered {
    if (!is_visible("clean", true)) {
      return;
    }
    return (
      <Button
        key={"clean"}
        bsSize={button_size()}
        onClick={() => props.actions.clean?.(props.id)}
        title={"Clean auxiliary build files"}
      >
        <Icon name={"trash"} />{" "}
        <VisibleMDLG>{labels ? "Clean" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_count_words(): Rendered {
    if (!is_visible("word_count", true)) {
      return;
    }
    return (
      <Button
        key={"word_count"}
        bsSize={button_size()}
        onClick={() => props.actions.word_count?.(0, true)}
        title={"Runs texcount"}
      >
        <Icon name={"file-alt"} /> <VisibleMDLG>Count words</VisibleMDLG>
      </Button>
    );
  }

  function render_kick_other_users_out(): Rendered {
    if (!is_visible("kick_other_users_out")) {
      return;
    }
    return (
      <div
        key={"kick_other_users_out"}
        ref={getTourRef("kick_other_users_out")}
        style={{ display: "inline-block" }}
      >
        <Button
          bsSize={button_size()}
          onClick={() => props.actions.kick_other_users_out(props.id)}
          title={"Kick all other users out"}
        >
          <Icon name={"skull-crossbones"} />
        </Button>
      </div>
    );
  }

  function render_pause(labels): Rendered {
    if (!is_visible("pause")) {
      return;
    }
    let icon: IconName, title: string, style: ButtonStyle | undefined;
    if (props.is_paused) {
      icon = "play";
      title = "Play";
      style = "success";
    } else {
      icon = "pause";
      title = "Pause";
    }
    return (
      <div
        key="pause"
        ref={getTourRef("pause")}
        style={{ display: "inline-block" }}
      >
        <Button
          bsSize={button_size()}
          bsStyle={style}
          onClick={() => {
            if (props.is_paused) {
              props.actions.unpause(props.id);
            } else {
              props.actions.pause(props.id);
            }
          }}
          title={title}
        >
          <Icon name={icon} />
          <VisibleMDLG>{labels ? " " + title : undefined}</VisibleMDLG>
        </Button>
      </div>
    );
  }

  function render_edit_init_script(): Rendered {
    if (!is_visible("edit_init_script")) {
      return;
    }
    return (
      <div
        key="edit_init_script"
        ref={getTourRef("edit_init_script")}
        style={{ display: "inline-block" }}
      >
        <Button
          bsSize={button_size()}
          onClick={() => props.actions.edit_init_script(props.id)}
          title={"Edit initialization script"}
        >
          <Icon name={"rocket"} />{" "}
        </Button>
      </div>
    );
  }

  function render_clear(): Rendered {
    if (!is_visible("clear")) {
      return;
    }
    const info = props.editor_spec[props.type].clear_info ?? {
      text: "Clear this frame?",
      confirm: "Yes",
    };
    const title = <div style={{ maxWidth: "250px" }}>{info.text}</div>;
    const icon = <Icon unicode={0x2620} />;
    return (
      <Popconfirm
        key={"clear"}
        placement={"bottom"}
        title={title}
        icon={icon}
        onConfirm={() => props.actions.clear?.(props.id)}
        okText={info.confirm}
        cancelText={"Cancel"}
      >
        <div ref={getTourRef("clear")} style={{ display: "inline-block" }}>
          <Button bsSize={button_size()} title={"Clear"}>
            {icon}{" "}
          </Button>
        </div>
      </Popconfirm>
    );
  }

  function render_close_and_halt(labels: boolean): Rendered {
    if (!is_visible("close_and_halt")) {
      return;
    }
    return (
      <Button
        key={"close_and_halt"}
        disabled={close_and_halt_confirm}
        bsSize={button_size()}
        onClick={() => set_close_and_halt_confirm(true)}
        title={"Close and halt server"}
      >
        <Icon name={"PoweroffOutlined"} />{" "}
        <VisibleMDLG>{labels ? "Halt" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_halt_jupyter(): Rendered {
    if (!is_visible("halt_jupyter")) return;
    return (
      <Button
        key={"halt_jupyter"}
        bsSize={button_size()}
        onClick={() => props.editor_actions.halt_jupyter?.()}
      >
        <Icon name={"PoweroffOutlined"} /> <VisibleMDLG>Halt</VisibleMDLG>
      </Button>
    );
  }

  function render_export_to_markdown(labels): Rendered {
    if (
      !is_visible("export_to_markdown") ||
      student_project_functionality.disableActions
    ) {
      return;
    }
    return (
      <Button
        key={"export"}
        bsSize={button_size()}
        onClick={() => props.editor_actions["export_to_markdown"]?.(props.id)}
        title={"Export to Markdown File..."}
      >
        <Icon name={"markdown"} />{" "}
        <VisibleMDLG>{labels ? "Export" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_print(labels): Rendered {
    if (!is_visible("print") || student_project_functionality.disableActions) {
      return;
    }
    return (
      <Button
        key={"print"}
        bsSize={button_size()}
        onClick={() => props.editor_actions.print(props.id)}
        title={"Print file..."}
      >
        <Icon name={"print"} />{" "}
        <VisibleMDLG>{labels ? "Print" : undefined}</VisibleMDLG>
      </Button>
    );
  }

  function render_terminal(labels): Rendered {
    if (
      !is_visible("terminal") ||
      is_public ||
      student_project_functionality.disableTerminals
    ) {
      return;
    }
    return (
      <Button
        key={"terminal"}
        bsSize={button_size()}
        onClick={() => {
          props.actions.terminal(props.id);
          track("terminal");
        }}
        title={button_title("terminal", "Open a command line terminal")}
      >
        <Icon name={"terminal"} />{" "}
        <VisibleMDLG>{button_text("terminal", labels)}</VisibleMDLG>
      </Button>
    );
  }

  function render_shell(labels): Rendered {
    if (
      !is_visible("shell") ||
      is_public ||
      student_project_functionality.disableTerminals
    ) {
      return;
    }
    return (
      <Button
        key={"shell"}
        bsSize={button_size()}
        onClick={() => props.actions.shell(props.id)}
        title={button_title("shell", "Open a shell for running this code")}
      >
        <Icon name={"terminal"} />{" "}
        <VisibleMDLG>{button_text("shell", labels)}</VisibleMDLG>
      </Button>
    );
  }

  function render_edit(): Rendered {
    if (!is_visible("edit") || is_public) {
      return;
    }
    return (
      <Button
        key={"edit"}
        bsSize={button_size()}
        onClick={() => props.actions["edit"]?.(props.id)}
        title={button_title("shell", "Click to edit file directly here")}
      >
        <Icon name={"lock"} /> <VisibleMDLG>Locked</VisibleMDLG>
      </Button>
    );
  }

  function render_readonly_view(): Rendered {
    if (!is_visible("readonly_view") || is_public) {
      return;
    }
    return (
      <Button
        key={"readonly-view"}
        bsSize={button_size()}
        onClick={() => props.actions["readonly_view"]?.(props.id)}
        title={button_title("shell", "Click to switch to readonly view")}
      >
        <Icon name={"pencil"} /> <VisibleMDLG>Editable</VisibleMDLG>
      </Button>
    );
  }

  function render_actions_dropdown(labels: boolean): Rendered {
    if (isExplicitlyHidden("actions")) return;
    // We don't show this menu in kiosk mode, where none of the options make sense,
    // because they are all file management, which should be handled a different way.
    if (fullscreen == "kiosk") return;
    // Also, instructors can disable this for students:
    if (student_project_functionality.disableActions) return;
    const spec = props.editor_spec[props.type];
    if (spec != null && spec.hide_file_menu) return;
    return (
      <EditorFileInfoDropdown
        key={"info"}
        filename={props.path}
        project_id={props.project_id}
        is_public={false}
        label={labels ? "Actions" : ""}
        style={{ height: button_height() }}
      />
    );
  }

  function render_buttons(
    forceLabels?: boolean,
    style?: CSS,
    noRefs?
  ): Rendered {
    if (!(props.is_only || props.is_full)) {
      // When in split view, we let the buttonbar flow around and hide, so that
      // extra buttons are cleanly not visible when frame is thin.
      style = {
        display: "flex",
        maxHeight: "30px",
        ...style,
      };
    } else {
      style = {
        display: "flex",
        maxHeight: "34px",
        marginLeft: "2px",
        ...style,
      };
    }
    try {
      if (noRefs) {
        // When rendering the buttons for the all button popover, we
        // must NOT set the tour refs, since if we do, then they get
        // stolen and the tour then breaks! So we temporarily disable
        // the refs and re-enable them in the finally below.
        disableTourRefs.current = true;
      }

      const labels: boolean = forceLabels ?? show_labels();

      const v: Rendered[] = [];
      v.push(renderPage());
      v.push(render_save_timetravel_group(labels));
      v.push(render_actions_dropdown(labels));
      v.push(render_build());
      v.push(render_force_build());
      v.push(render_edit());
      v.push(render_readonly_view());
      v.push(render_sync(labels));
      v.push(render_switch_to_file());
      v.push(render_clean(labels));
      v.push(render_zoom_group());
      v.push(render_rescan_latex_directives());
      if (!is_public) {
        v.push(render_undo_redo_group());
      }
      v.push(render_terminal(labels));
      v.push(render_format(labels));
      v.push(render_restart(labels));
      v.push(render_close_and_halt(labels));

      v.push(render_page_width_height_group());
      v.push(render_download(labels));
      v.push(render_pause(labels));
      v.push(render_copy_group());
      v.push(render_find_replace_group());
      if (!is_public) {
        v.push(render_format_group());
      }
      v.push(render_halt_jupyter());
      v.push(render_edit_init_script());
      v.push(render_clear());
      v.push(render_count_words());
      v.push(render_kick_other_users_out());
      v.push(render_shell(labels));
      v.push(render_print(labels));
      v.push(render_export_to_markdown(labels));
      v.push(render_table_of_contents(labels));
      v.push(render_show_pages(labels));
      v.push(render_show_overview(labels));
      v.push(render_show_slideshow(labels));
      v.push(render_show_speaker_notes(labels));
      v.push(render_show_search(labels));
      v.push(render_guide(labels));
      v.push(render_help(labels));

      const w: Rendered[] = [];
      for (const c of v) {
        if (c != null) {
          w.push(c);
        }
      }

      return (
        <div
          style={style}
          key={"buttons"}
          className={"cc-frame-tree-title-bar-buttons"}
        >
          {r_join(w, <Gap />)}
        </div>
      );
    } finally {
      if (noRefs) {
        disableTourRefs.current = false;
      }
    }
  }

  function render_main_buttons(): Rendered {
    // This is complicated below (with the flex display) in order to have a drop down menu that actually appears
    // and *ALSO* have buttons that vanish when there are many of them.
    const style: CSS = {
      flexFlow: "row nowrap",
      display: "flex",
      flex: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
    };
    return <div style={style}>{render_buttons()}</div>;
  }

  function allButtonsPopover() {
    return (
      <Popover
        overlayStyle={{ zIndex: 990 }}
        open={
          props.tab_is_visible && props.is_visible && showMainButtonsPopover
        }
        content={() => {
          return (
            <div style={{ display: "flex", maxWidth: "100vw" }}>
              <div
                style={{
                  marginLeft: "3px",
                  marginRight: "3px",
                }}
              >
                {render_buttons(
                  true,
                  { maxHeight: "50vh", display: "block" },
                  true
                )}
              </div>
              <div>{render_types()}</div>
              <Icon
                onClick={() => setShowMainButtonsPopover(false)}
                name="times"
                style={{
                  color: COLORS.GRAY_M,
                  marginTop: "10px",
                  marginLeft: "10px",
                }}
              />
            </div>
          );
        }}
      >
        <div
          key="all-buttons"
          ref={getTourRef("all-buttons")}
          style={{ display: "inline-block" }}
        >
          <AntdButton
            type="text"
            style={{
              margin: "0 3px",
              height: props.is_only || props.is_full ? "34px" : "30px",
            }}
            onClick={() => setShowMainButtonsPopover(!showMainButtonsPopover)}
          >
            <Icon name="ellipsis" />
          </AntdButton>
        </div>
      </Popover>
    );
  }

  function render_connection_status(): Rendered | undefined {
    if (!props.connection_status || !is_visible("connection_status", true)) {
      return;
    }
    if (props.connection_status == "connected") {
      // To reduce clutter show nothing when connected.
      // NOTE: Keep this consistent with
      // cocalc/src/@cocalc/frontend/project/websocket/websocket-indicator.tsx
      return;
    }
    const is_active = props.active_id === props.id;
    const style = is_active
      ? Object.assign({}, CONNECTION_STATUS_STYLE, {
          background: COL_BAR_BACKGROUND,
        })
      : CONNECTION_STATUS_STYLE;

    return (
      <span style={style} title={props.connection_status}>
        <ConnectionStatusIcon status={props.connection_status} />
      </span>
    );
  }

  function render_title(): Rendered {
    let title: string = "";
    let icon: IconName | undefined = undefined;
    if (props.title !== undefined) {
      title = props.title;
    }
    if (props.editor_spec != null) {
      const spec = props.editor_spec[props.type];
      if (spec != null) {
        icon = spec.icon;
        if (!title) {
          if (spec.name) {
            title = spec.name;
          } else if (spec.short) {
            title = spec.short;
          }
        }
      }
    }

    const body = (
      <div
        ref={getTourRef("title")}
        style={{
          ...TITLE_STYLE,
          color: is_active ? undefined : "#777",
        }}
      >
        {icon && <Icon name={icon} style={{ marginRight: "5px" }} />}
        {trunc_middle(title, MAX_TITLE_WIDTH)}
      </div>
    );
    if (title.length >= MAX_TITLE_WIDTH) {
      return <Tooltip title={title}>{body}</Tooltip>;
    }
    return body;
  }

  function render_close_and_halt_confirm(): Rendered {
    if (!close_and_halt_confirm) return;
    return (
      <div
        style={{
          padding: "5px",
          borderBottom: "1px solid lightgrey",
          position: "absolute",
          width: "100%",
          zIndex: 100,
          background: "white",
          boxShadow: "rgba(0, 0, 0, 0.25) 0px 6px 24px",
        }}
      >
        Halt the server and close this?
        <Button
          onClick={() => {
            set_close_and_halt_confirm(false);
            props.actions.close_and_halt?.(props.id);
          }}
          style={{
            marginLeft: "20px",
            marginRight: "5px",
          }}
          bsStyle="danger"
        >
          <Icon name={"PoweroffOutlined"} /> Close and Halt
        </Button>
        <Button onClick={() => set_close_and_halt_confirm(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  function render_confirm_bar(): Rendered {
    return (
      <div style={{ position: "relative" }}>
        {render_close_and_halt_confirm()}
      </div>
    );
  }

  function renderPage() {
    if (
      props.page == null ||
      props.pages == null ||
      isExplicitlyHidden("page")
    ) {
      // do not render anything unless both page and pages are set
      return;
    }
    let content;
    if (typeof props.pages == "number") {
      // pages contains the number of pages and page must also be a number
      if (props.pages <= 1) {
        // only one page so don't render anything
        return;
      }
      // Below we use step=-1 and do not set min/max so that
      // the up/down buttons are switched from usual, which makes
      // sense for page numbers.

      // Style: the button heights actually changes a bit depending
      // on if it's the only frame or not, so our input box also has
      // to adjust.
      content = (
        <>
          <InputNumber
            style={{
              width: "9ex",
              top: "-4px",
              height: !props.is_only && !props.is_full ? "30px" : undefined,
            }}
            step={-1}
            value={props.page}
            onChange={(page: number) => {
              if (!page) return;
              if (page <= 1) {
                page = 1;
              }
              if (typeof props.pages == "number" && page >= props.pages) {
                page = props.pages;
              }
              props.actions.setPage(props.id, page);
            }}
          />{" "}
          / {props.pages}
        </>
      );
    } else {
      // pages is a immutable list of string names of the pages
      if (props.pages.size <= 1) {
        return;
      }
      const n = props.pages.indexOf(`${props.page}`);
      if (n == -1) {
        content = (
          <>
            <Input
              style={{ width: "9ex", height: "30px" }}
              value={props.page}
              onChange={(e) => {
                if (!e.target.value) return;
                props.actions.setPage(props.id, e.target.value);
              }}
            />{" "}
            / {props.pages.size}
          </>
        );
      } else {
        content = (
          <>
            <Input
              style={{ width: "9ex", height: "30px" }}
              value={props.page}
              onChange={(e) => props.actions.setPage(props.id, e.target.value)}
            />{" "}
            ({n + 1} of {props.pages.size})
          </>
        );
      }
    }
    return (
      <span
        key={"page"}
        style={{
          height: "30px",
          lineHeight: "30px",
          textAlign: "center",
        }}
      >
        {content}
      </span>
    );
  }

  // Whether this is *the* active currently focused frame:
  let style;
  style = copy(title_bar_style);
  style.background = COL_BAR_BACKGROUND;
  if (!props.is_only && !props.is_full) {
    style.maxHeight = "34px";
  } else {
    style.maxHeight = "38px";
  }
  // position relative, so we can absolute position the
  // frame controls to the right
  style.position = "relative";

  if (is_safari()) {
    // ugly hack....
    // for some reason this is really necessary on safari, but
    // breaks on everything else!
    if (props.is_only || props.is_full) {
      style.minHeight = "36px";
    } else {
      style.minHeight = "32px";
    }
  }

  return (
    <>
      <div
        style={style}
        id={`titlebar-${props.id}`}
        className={"cc-frame-tree-title-bar"}
      >
        {render_title()}
        {render_main_buttons()}
        {render_connection_status()}
        {allButtonsPopover()}
        {render_control()}
      </div>
      {render_confirm_bar()}
      {hasTour && props.is_visible && props.tab_is_visible && (
        <TitleBarTour refs={tourRefs} />
      )}
    </>
  );
};
