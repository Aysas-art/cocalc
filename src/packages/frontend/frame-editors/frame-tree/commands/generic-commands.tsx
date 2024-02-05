import { get_default_font_size } from "@cocalc/frontend/frame-editors/generic/client";
import {
  undo as chatUndo,
  redo as chatRedo,
} from "@cocalc/frontend/frame-editors/generic/chat";
import { Icon } from "@cocalc/frontend/components";
import { redux } from "@cocalc/frontend/app-framework";
import { debounce } from "lodash";
import { useEffect, useRef } from "react";
import { FORMAT_SOURCE_ICON } from "@cocalc/frontend/frame-editors/frame-tree/config";
import { IS_MACOS } from "@cocalc/frontend/feature";
import userTracking from "@cocalc/frontend/user-tracking";
import openSupportTab from "@cocalc/frontend/support/open";
import { Input } from "antd";
import { SEARCH_COMMANDS } from "./const";
import { addCommands } from "./commands";
import { set_account_table } from "@cocalc/frontend/account/util";

addCommands({
  "split-row": {
    group: "frame-control",
    alwaysShow: true,
    pos: 1,
    title: "Split frame horizontally into two rows",
    onClick: ({ props }) => {
      if (props.is_full) {
        return props.actions.unset_frame_full();
      } else {
        return props.actions.split_frame("row", props.id);
      }
    },
    icon: "horizontal-split",
    label: "Split Down",
    button: "Split",
  },
  "split-col": {
    group: "frame-control",
    alwaysShow: true,
    pos: 2,
    title: "Split frame vertically into two columns",
    onClick: ({ props }) => {
      if (props.is_full) {
        return props.actions.unset_frame_full();
      } else {
        return props.actions.split_frame("col", props.id);
      }
    },
    icon: "vertical-split",
    label: "Split Right",
    button: "Split",
  },
  maximize: {
    group: "frame-control",
    alwaysShow: true,
    pos: 3,
    title: "Toggle whether or not this frame is maximized",
    onClick: ({ props }) => {
      if (props.is_full) {
        props.actions.unset_frame_full();
      } else {
        props.actions.set_frame_full(props.id);
      }
    },
    label: ({ props }) => {
      if (props.is_full) {
        return <span>Demaximize Frame</span>;
      } else {
        return <span>Maximize Frame</span>;
      }
    },
    icon: "expand",
  },
  close: {
    group: "frame-control",
    alwaysShow: true,
    pos: 4,
    title: "Close this frame. Close all frames to restore the default layout.",
    onClick: ({ props }) => {
      props.actions.close_frame(props.id);
    },
    label: "Close Frame",
    button: "Close",
    icon: "times",
  },
  show_table_of_contents: {
    group: "show-frames",
    title: "Show the Table of Contents",
    icon: "align-right",
    label: "Table of Contents",
    button: "Contents",
  },
  guide: {
    group: "show-frames",
    title: "Show guidebook",
    onClick: ({ props }) => {
      props.actions.guide(props.id, props.type);
    },
    label: "Guide",
    icon: "magic",
  },
  show_search: {
    group: "find",
    pos: 0,
    title: "Show panel for searching in this document",
    label: "Search",
    icon: "search",
  },
  show_overview: {
    group: "show-frames",
    title: "Show overview of all pages",
    label: "Overview",
    icon: "overview",
  },
  show_pages: {
    group: "show-frames",
    title: "Show all pages of this document",
    label: "Pages",
    icon: "pic-centered",
  },
  show_slideshow: {
    group: "show-frames",
    title: "Display Slideshow Presentation",
    label: "Slideshow",
    icon: "play-square",
  },
  show_speaker_notes: {
    group: "show-frames",
    title: "Show Speaker Notes",
    label: "Speaker Notes",
    icon: "pencil",
  },
  shell: {
    group: "show-frames",
    title: "Open a terminal for running code",
    icon: "terminal",
    disable: "disableTerminals",
    label: "Shell",
  },
  terminal: {
    group: "show-frames",
    title: "Open a command line terminal for interacting with the Linux prompt",
    icon: "terminal",
    disable: "disableTerminals",
    label: "Terminal",
  },
  decrease_font_size: {
    stayOpenOnClick: true,
    pos: 1,
    group: "zoom",
    title: "Decrease Font Size",
    icon: "search-minus",
    label: "Zoom Out",
    keyboard: "control + <",
    button: "Smaller",
  },
  increase_font_size: {
    stayOpenOnClick: true,
    pos: 0,
    group: "zoom",
    title: "Increase Font Size",
    icon: "search-plus",
    label: "Zoom In",
    keyboard: "control + >",
    button: "Bigger",
  },
  zoom_page_width: {
    pos: 3,
    group: "zoom",
    title: "Zoom to page width",
    label: "Zoom to Width",
    icon: "ColumnWidthOutlined",
  },
  zoom_page_height: {
    pos: 4,
    group: "zoom",
    title: "Zoom to page height",
    label: "Zoom to Height",
    icon: "ColumnHeightOutlined",
  },
  set_zoom: {
    pos: 5,
    group: "zoom",
    title: "Zoom to a preset size",
    label: ({ props }) => (
      <span>
        {props.font_size == null
          ? "Set Zoom"
          : `${Math.round((100 * props.font_size) / get_default_font_size())}%`}
      </span>
    ),
    onClick: () => {},
    icon: "percentage",
    children: [50, 85, 100, 115, 125, 150, 200].map((zoom) => {
      return {
        stayOpenOnClick: true,
        label: `${zoom}%`,
        onClick: ({ props }) => {
          // console.log("set_zoom", { zoom }, zoom / 100, props.id);
          props.actions.set_zoom(zoom / 100, props.id);
        },
      };
    }),
  },
  undo: {
    stayOpenOnClick: true,
    group: "undo-redo",
    pos: 0,
    icon: "undo",
    label: "Undo",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + Z`,
    onClick: ({ props }) => {
      if (props.type == "chat") {
        // we have to special case this until we come up with a better way of having
        // different kinds of actions for other frames.
        chatUndo(props.project_id, props.path);
      } else {
        props.editor_actions.undo(props.id);
      }
    },
  },
  redo: {
    stayOpenOnClick: true,
    group: "undo-redo",
    pos: 1,
    icon: "redo",
    label: "Redo",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + shift + Z`,
    onClick: ({ props }) => {
      if (props.type == "chat") {
        // see undo comment above
        chatRedo(props.project_id, props.path);
      } else {
        props.editor_actions.redo(props.id);
      }
    },
  },
  cut: {
    group: "copy",
    pos: 0,
    label: "Cut",
    title: "Cut selection",
    icon: "scissors",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + X`,
    disabled: ({ readOnly }) => readOnly,
  },
  copy: {
    group: "copy",
    pos: 1,
    label: "Copy",
    title: "Copy selection",
    icon: "copy",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + C`,
  },
  paste: {
    group: "copy",
    pos: 2,
    label: "Paste",
    title: "Paste buffer",
    icon: "paste",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + V`,
    disabled: ({ readOnly }) => readOnly,
    onClick: debounce(
      ({ props }) => props.editor_actions.paste(props.id, true),
      200,
      {
        leading: true,
        trailing: false,
      },
    ),
  },

  edit_init_script: {
    group: "config",
    label: "Initialization Script",
    title: "Edit the initialization script that is run when this starts",
    icon: "rocket",
    tour: "edit_init_script",
  },

  help: {
    pos: 0,
    group: "help-link",
    label: "Documentation",
    icon: "question-circle",
    title: "Show documentation for working with this editor",
    tour: "help",
  },

  clear: {
    group: "action",
    button: "Clear",
    label: "Clear Frame",
    icon: <Icon unicode={0x2620} />,
    popconfirm: {
      title: "Clear this frame?",
    },
  },

  pause: {
    group: "action",
    button: "Pause",
    icon: "pause",
    label: ({ props }) => {
      if (props.is_paused) {
        return (
          <div
            style={{
              display: "inline-block",
              background: "green",
              color: "white",
              padding: "0 20px",
            }}
          >
            Resume
          </div>
        );
      }
      return <span>Pause</span>;
    },
    title: "Pause this frame temporarily",
    onClick: ({ props }) => {
      if (props.is_paused) {
        props.actions.unpause(props.id);
      } else {
        props.actions.pause(props.id);
      }
    },
  },

  restart: {
    group: "action",
    icon: "sync",
    label: "Restart Server",
    title: "Restart the backend service",
  },

  kick_other_users_out: {
    group: "other-users",
    icon: "skull-crossbones",
    title:
      "Kick all other users out from this document. It will close in all other browsers.",
    tour: "kick_other_users_out",
    label: "Kick Other Users Out",
    button: "Kick",
  },

  halt_jupyter: {
    group: "quit",
    icon: "PoweroffOutlined",
    label: "Close and Halt...",
    button: "Halt",
    title: "Halt the running Jupyter kernel and close this notebook.",
  },

  close_and_halt: {
    group: "quit",
    icon: "PoweroffOutlined",
    label: "Close and Halt...",
    title: "Halt backend server and close this file.",
  },

  reload: {
    group: "reload",
    icon: "reload",
    label: "Reload",
    title: "Reload this document",
  },

  time_travel: {
    group: "show-frames",
    pos: 3,
    icon: "history",
    label: "TimeTravel",
    title: "Show complete editing history of this document",
    onClick: ({ props, event }) => {
      if (props.actions.name != props.editor_actions.name) {
        // a subframe editor -- always open time travel in a name tab.
        props.editor_actions.time_travel({ frame: false });
        return;
      }
      // If a time_travel frame type is available and the
      // user does NOT shift+click, then open as a frame.
      // Otherwise, it opens as a new tab.
      const frame = !event.shiftKey && props.editor_spec["time_travel"] != null;
      props.actions.time_travel({
        frame,
      });
    },
  },
  find: {
    group: "find",
    pos: 0,
    label: "Find",
    icon: "search",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + F`,
  },
  replace: {
    group: "find",
    pos: 0,
    label: "Replace",
    icon: "replace",
    disabled: ({ readOnly }) => readOnly,
  },
  goto_line: {
    group: "find",
    pos: 3,
    label: "Goto Line",
    button: "Line",
    icon: "bolt",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + L`,
  },
  auto_indent: {
    group: "code-format",
    label: "Auto Indent",
    title: "Automatically indent selected code",
    disabled: ({ readOnly }) => readOnly,
    icon: "indent",
  },
  format: {
    group: "code-format",
    label: "Format Source Code",
    title: "Syntactically format using a parser such as prettier.",
    icon: FORMAT_SOURCE_ICON,
  },

  build: {
    group: "build",
    label: "Build",
    title:
      "Build the document.  To disable automatic builds, change Account → Editor → 'Build on save'.",
    icon: "play-circle",
  },

  force_build: {
    group: "build",
    label: "Force Build",
    title: "Force rebuild entire project.",
    icon: "play",
  },

  clean: {
    group: "build",
    label: "Delete Aux Files",
    title: "Delete all temporary files left around from builds",
    icon: "trash",
  },

  rescan_latex_directive: {
    group: "scan",
    label: "Scan for Build Directives",
    title: (
      <>
        Rescan the document for build directives, starting{" "}
        <code>'% !TeX program = xelatex, pdflatex, etc'</code> or{" "}
        <code>'% !TeX cocalc = exact command line'</code>
      </>
    ),
    icon: "reload",
  },
  sync: {
    group: "show-frames",
    button: "Sync",
    label: "Synchronize Views",
    keyboard: `${IS_MACOS ? "⌘" : "alt"} + enter`,
    title: "Synchronize the latex source view with the PDF output",
    icon: "sync",
    onClick: ({ props }) => {
      props.actions.sync?.(props.id, props.editor_actions);
    },
  },
  export_to_markdown: {
    group: "export",
    label: "Export to Markdown",
    title:
      "Create and open a markdown version of current view of this document.",
    icon: "markdown",
  },

  word_count: {
    group: "get-info",
    label: "Word Count",
    title: "Show information about the number of words in this document.",
    icon: "file-alt",
    onClick: ({ props }) => {
      props.actions.word_count?.(0, true);
    },
  },

  tour: {
    group: "tour",
    label: "Take the Tour",
    title: "Take a guided tour of the user interface for this editor.",
    icon: "map",
    neverVisibleOnMobile: true,
    onClick: ({ props }) => {
      userTracking("tour", { name: `frame-${props.type}` });
      props.actions.set_frame_full(props.id);
      // we have to wait until the frame renders before
      // setting the tour; otherwise, the references won't
      // be defined and it won't work.
      setTimeout(
        () => props.actions.set_frame_tree({ id: props.id, tour: true }),
        1,
      );
    },
  },

  readonly_view: {
    pos: -1,
    group: "show-frames",
    icon: "lock",
    title:
      "This is an editable view of the document. You can edit it directly.  Select this option to switch to a read only view.",
    label: "Switch to Readonly View",
    button: "Lock",
    onClick: ({ props }) => {
      props.actions["readonly_view"]?.(props.id);
    },
  },

  edit: {
    pos: -1,
    group: "show-frames",
    icon: "pencil",
    title:
      "This is a readonly view of the document.  Select this option to switch to a directly editable view.",
    label: "Switch to Editable View",
    button: "Edit",
    onClick: ({ props }) => props.actions["edit"]?.(props.id),
  },

  delete: {
    group: "delete",
    icon: "trash",
    title: "Delete this file",
    label: "Delete File",
    ...fileAction("delete"),
  },

  rename: {
    pos: 0,
    group: "misc-file-actions",
    icon: "swap",
    title: "Rename this file",
    label: "Rename File",
    ...fileAction("rename"),
  },
  compress: {
    pos: 1,
    group: "misc-file-actions",
    icon: "compress",
    title: "Compress this file",
    label: "Compress File",
    ...fileAction("compress"),
  },
  duplicate: {
    pos: 2,
    group: "misc-file-actions",
    icon: "clone",
    title: "Duplicate this file",
    label: "Duplicate File",
    ...fileAction("duplicate"),
  },
  copy_file: {
    pos: 3,
    group: "misc-file-actions",
    icon: "files",
    title: "Copy this file to another directory or project",
    label: "Copy File",
    ...fileAction("copy"),
  },
  move_file: {
    pos: 4,
    group: "misc-file-actions",
    icon: "move",
    title: "Move this file to another directory",
    label: "Move File",
    ...fileAction("move"),
  },
  download: {
    group: "export",
    label: "Download File",
    title: "Download this file",
    icon: "cloud-download",
    ...fileAction("download"),
  },
  download_pdf: {
    group: "export",
    label: "Download PDF",
    title: "Download the PDF file",
    icon: "cloud-download",
  },
  upload: {
    pos: 10,
    group: "misc-file-actions",
    icon: "upload",
    title: "Upload a file or directory from your compute to the server",
    label: "Upload",
    ...fileAction("upload"),
  },
  share: {
    pos: 10,
    group: "export",
    icon: "share-square",
    title:
      "Make this file available to be easily copies by other people, either publicly or for people who know the link.",
    button: "Publish",
    label: "Publish File",
    ...fileAction("share"),
  },
  print: {
    pos: 2,
    group: "export",
    icon: "print",
    title: "Show a printable version of this document in a popup window.",
    label: "Print",
  },
  new: {
    pos: 0,
    group: "new-open",
    icon: "plus-circle",
    title: "Create a new file",
    label: "New File",
    ...fileAction("new"),
  },
  open: {
    pos: 1,
    group: "new-open",
    icon: "files",
    title: "Open a file",
    label: "Open File",
    ...fileAction("open"),
  },
  open_recent: {
    pos: 2,
    group: "new-open",
    icon: "history",
    title: "Open a file that was recently opened",
    label: "Open Recent",
    ...fileAction("open_recent"),
  },
  save: {
    pos: 0,
    group: "save",
    icon: "save",
    title: "Save this file to disk",
    label: "Save",
    keyboard: `${IS_MACOS ? "⌘" : "control"} + S`,
  },
  chatgpt: {
    pos: 1,
    group: "show-frames",
    icon: "robot",
    title:
      "Ask an Artificial Intelligence Assistant (e.g., ChatGPT) for help on what you're doing.",
    label: "AI Assistant",
    onClick: ({ setShowAI }) => setShowAI?.(true),
    isVisible: ({ props }) =>
      redux.getStore("projects").hasLanguageModelEnabled(props.project_id),
  },
  chat: {
    alwaysShow: true,
    pos: 5,
    group: "help-link",
    icon: "comment",
    label: "Chat With People or AI",
    button: "Chat",
    title:
      "Open chat on the side of this file for chatting with project collaborators or AI about this file.",
    onClick: ({ props }) => {
      redux.getProjectActions(props.project_id).open_chat({ path: props.path });
    },
  },
  support: {
    alwaysShow: true,
    pos: 6,
    group: "help-link",
    icon: "medkit",
    label: "Support Ticket",
    button: "Support",
    title:
      "Create a support ticket.  Ask the people at CoCalc a question, report a bug, etc.",
    onClick: () => {
      openSupportTab();
    },
  },
  [SEARCH_COMMANDS]: {
    stayOpenOnClick: true,
    alwaysShow: true,
    pos: 0,
    group: "search-commands",
    title: "Search through all commands for this document frame.",
    label: ({ helpSearch, setHelpSearch }) => {
      return (
        <SearchBox helpSearch={helpSearch} setHelpSearch={setHelpSearch} />
      );
    },
    onClick: () => {},
  },
  about: {
    group: "about",
    icon: "info-circle",
    title: "About this application",
    label: "About",
  },
  //   quit: {
  //     pos: 10,
  //     group: "quit",
  //     icon: "PoweroffOutlined",
  //     title: "Quit this editor",
  //     label: "Quit Application",
  //     ...fileAction("quit"),
  //   },
  close_tab: {
    pos: 9,
    group: "quit",
    icon: "times-circle",
    title: "Close this editor",
    label: "Close File",
    button: "Close",
    ...fileAction("close"),
  },
  new_frame_of_type: {
    alwaysShow: true,
    icon: "plus-square",
    group: "frame_types",
    title: "Create a new frame with an editor of the given type",
    label: "New Frame",
    button: "Frame",
    onClick: ({}) => {},
    children: ({ frameTypeCommands }) => frameTypeCommands(true),
  },
  frame_type: {
    alwaysShow: true,
    icon: "frame",
    group: "frame_types",
    title: "Change the type of editor to show in this frame",
    label: "Change Type",
    button: "Type",
    onClick: ({}) => {},
    children: ({ frameTypeCommands }) => frameTypeCommands(false),
  },
  reset_local_view_state: {
    alwaysShow: true,
    icon: "layout",
    group: "frame_types",
    title: "Reset the layout of all frames to the default",
    label: "Default Layout",
    button: "Default",
  },
  button_bar: {
    alwaysShow: true,
    icon: "tool",
    group: "button-bar",
    label: "Menu Toolbar",
    button: "Toolbar",
    children: [
      {
        name: "disable-button-toolbar",
        icon: "trash",
        group: "button-bar",
        title:
          "Disable all buttons just for this editor. This hides the toolbar for this editor only.",
        label: "Remove All Buttons",
        popconfirm: {
          title: "Remove All Buttons",
          description: (
            <div>
              If you disable all buttons just for this editor, then you won't
              see the button toolbar for this editor unless you enable some
              buttons. This does not impact any other editor.
            </div>
          ),
          cancelText: "Cancel",
          okText: "Remove All",
        },
        onClick: (manage) => {
          manage.removeAllToolbarButtons();
        },
      },
      {
        name: "reset-button-toolbar",
        icon: "undo",
        group: "button-bar",
        title:
          "Reset the toolbar for this editor to its default state, removing any buttons you added or removed.",
        label: "Reset to Default",
        popconfirm: {
          title: "Reset Toolbar to Default",
          description: (
            <div>
              If you reset the button toolbar the choice of commands in the
              toolbar for this specific type of editor will revert to the
              default state.
            </div>
          ),
          cancelText: "Cancel",
          okText: "Reset",
        },
        onClick: (manage) => {
          manage.resetToolbar();
        },
      },
    ],
  },

  toggle_button_bar: {
    button: "Buttons",
    alwaysShow: true,
    icon: () =>
      redux.getStore("account").getIn(["editor_settings", "extra_button_bar"])
        ? "eye-slash"
        : "eye",
    group: "button-bar",
    title:
      "Toggle whether or not the menu toolbar is displayed for all editors.",
    label: () => (
      <>
        {redux
          .getStore("account")
          .getIn(["editor_settings", "extra_button_bar"])
          ? "Hide"
          : "Show"}{" "}
        Menu Toolbar...
      </>
    ),
    popconfirm: () => {
      const visible = redux
        .getStore("account")
        .getIn(["editor_settings", "extra_button_bar"]);
      if (!visible) {
        return;
      }
      return {
        title: (
          <>
            <Icon name="eye-slash" /> Hide Menu Toolbar For All Editors
          </>
        ),
        description: (
          <div>
            The menu toolbar is a customizable bar of shortcuts to menu items.
            <ul>
              <li key="1">
                Everything in the menu toolbar is always available in the menus
                above.
              </li>
              <li key="2">
                Show the toolbar by selecting 'View -&gt; Show Menu Toolbar'.
              </li>
              <li key="3">
                Toggle buttons by clicking the icon next to any top level menu
                item.
              </li>
              <li key="4">
                Hide only this frame's toolbar: 'View -&gt; Menu Toolbar -&gt;
                Remove All Buttons'.
              </li>
            </ul>
          </div>
        ),
        cancelText: "Cancel",
        okText: "Hide Menu Toolbar",
      };
    },
    onClick: async () => {
      const visible = redux
        .getStore("account")
        .getIn(["editor_settings", "extra_button_bar"]);
      set_account_table({ editor_settings: { extra_button_bar: !visible } });
    },
  },
});

function fileAction(action) {
  return {
    alwaysShow: true,
    onClick: ({ props }) => {
      const actions = redux.getProjectActions(props.project_id);
      actions.show_file_action_panel({
        path: props.path,
        action,
      });
    },
  };
}

function SearchBox({ setHelpSearch, helpSearch }) {
  const didFocus = useRef<boolean>(false);
  useEffect(() => {
    return () => {
      if (didFocus.current) {
        // make sure it is restored.
        redux.getActions("page").enableGlobalKeyHandler();
      }
    };
  }, []);
  return (
    <Input.Search
      autoFocus
      placeholder="Search"
      allowClear
      value={helpSearch}
      onChange={(e) => setHelpSearch(e.target.value)}
      onFocus={() => {
        didFocus.current = true;
        redux.getActions("page").disableGlobalKeyHandler();
      }}
      onBlur={() => {
        redux.getActions("page").enableGlobalKeyHandler();
      }}
    />
  );
}
