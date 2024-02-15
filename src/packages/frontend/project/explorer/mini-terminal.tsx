/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
miniterm.cjsx -- a small terminal that lets you enter a single bash command.

IDEAS FOR LATER:

 - [ ] persistent history (in database/project store) -- this is in the log
 - [ ] tab completion
 - [ ] mode to evaluate in another program, e.g., %gp <...>
 - [ ] help

*/

import { React } from "../../app-framework";
import { user_activity } from "../../tracker";
import { ProjectActions } from "../../project_actions";
import { Button, Input, Space } from "antd";
import { Icon } from "@cocalc/frontend/components";
import { useStudentProjectFunctionality } from "@cocalc/frontend/course";
import { redux } from "@cocalc/frontend/app-framework";

// used to run the command -- could change to use an action and the store.
import { webapp_client } from "../../webapp-client";

const WIDTH = "256px";

export const output_style_searchbox: React.CSSProperties = {
  background: "white",
  position: "absolute",
  zIndex: 2,
  width: WIDTH,
  boxShadow: "-4px 4px 7px #aaa",
  maxHeight: "450px",
  overflow: "auto",
  borderRadius: "5px",
} as const;

export const output_style_miniterm: React.CSSProperties = {
  background: "white",
  position: "absolute",
  zIndex: 2,
  boxShadow: "-4px 4px 7px #aaa",
  maxHeight: "450px",
  overflow: "auto",
  right: 0,
  marginTop: "36px",
  marginRight: "5px",
  borderRadius: "5px",
  width: "100%",
} as const;

const BAD_COMMANDS = {
  sage: "Create a Sage worksheet instead,\nor type 'sage' in a full terminal.",
  ipython:
    "Create a Jupyter notebook instead,\nor type 'ipython' in a full terminal.",
  gp: "Create a Sage worksheet in GP mode\nor type 'gp' in a full terminal.",
  vi: "Type vi in a full terminal instead,\nor just click on the file in the listing.",
  vim: "Type vim in a full terminal instead,\nor just click on the file in the listing.",
  emacs:
    "Type emacs in a full terminal instead,\nor just click on the file in the listing.",
  open: "The open command is not yet supported\nin the miniterminal.  See\nhttps://github.com/sagemathinc/cocalc/issues/230",
} as const;

const EXEC_TIMEOUT = 10; // in seconds

interface Props {
  current_path: string;
  project_id: string;
  actions: ProjectActions;
  show_close_x?: boolean;
}

interface State {
  input: string;
  state: "edit" | "run";
  stdout?: string;
  error?: string;
}

class MiniTerminal0 extends React.Component<Props, State> {
  private _id: number = 0;

  constructor(props) {
    super(props);
    this.state = {
      input: "",
      stdout: undefined,
      state: "edit", // 'edit' --> 'run' --> 'edit'
      error: undefined,
    };
  }

  static defaultProps = {
    show_close_x: true,
  };

  execute_command = () => {
    this.setState({ stdout: "", error: "" });
    const input = this.state.input.trim();
    if (!input) {
      return;
    }
    const error = BAD_COMMANDS[input.split(" ")[0]];
    if (error) {
      this.setState({
        state: "edit",
        error,
      });
      return;
    }

    const input0 = input + '\necho $HOME "`pwd`"';
    this.setState({ state: "run" });

    this._id = this._id + 1;
    const id = this._id;
    const start_time = new Date().getTime();
    user_activity("mini_terminal", "exec", input);
    const compute_server_id = redux
      .getProjectStore(this.props.project_id)
      ?.get("compute_server_id");
    webapp_client.exec({
      project_id: this.props.project_id,
      command: input0,
      timeout: EXEC_TIMEOUT,
      max_output: 100000,
      bash: true,
      path: this.props.current_path,
      err_on_exit: false,
      compute_server_id,
      filesystem: true,
      cb: (err, output) => {
        if (this._id !== id) {
          // computation was canceled -- ignore result.
          return;
        }
        if (err) {
          this.setState({ error: JSON.stringify(err), state: "edit" });
        } else if (
          output.exit_code !== 0 &&
          new Date().getTime() - start_time >= 0.98 * EXEC_TIMEOUT
        ) {
          // we get no other error except it takes a long time and the exit_code isn't 0.
          this.setState({
            state: "edit",
            error: `Miniterminal commands are limited to ${EXEC_TIMEOUT} seconds.\nFor longer or interactive commands,\nuse a full terminal.`,
          });
        } else {
          if (output.stdout) {
            // Find the current path
            // after the command is executed, and strip
            // the output of "pwd" from the output:
            // NOTE: for compute servers which can in theory use a totally different HOME, this won't work.
            // However, by default on cocalc.com they use the same HOME, so it should work.
            // ALSO, note basically this same code is in frontend/project/explorer/search-bar.tsx
            let s = output.stdout.trim();
            let i = s.lastIndexOf("\n");
            if (i === -1) {
              output.stdout = "";
            } else {
              s = s.slice(i + 1);
              output.stdout = output.stdout.slice(0, i);
            }
            i = s.indexOf(" ");
            const full_path = s.slice(i + 1);
            if (full_path.slice(0, i) === s.slice(0, i)) {
              // only change if in project
              const path = s.slice(2 * i + 2);
              this.props.actions.open_directory(path);
            }
          }
          if (!output.stderr) {
            // only log commands that worked...
            this.props.actions.log({ event: "miniterm", input });
          }
          this.props.actions.fetch_directory_listing(); // update directory listing (command may change files)
          this.setState({
            state: "edit",
            error: output.stderr,
            stdout: `${
              this.props.current_path ? "~/" + this.props.current_path : "~"
            }$ ${input}\n${output.stdout}`,
          });
          if (!output.stderr) {
            this.setState({ input: "" });
          }
        }
      },
    });
  };

  render_button() {
    switch (this.state.state) {
      case "edit":
        return (
          <Button style={{ height: "33px" }} onClick={this.execute_command}>
            <Icon name="play" />
          </Button>
        );
      case "run":
        return (
          <Button style={{ height: "33px" }} onClick={this.execute_command}>
            <Icon name="cocalc-ring" spin />
          </Button>
        );
    }
  }

  render_close_x() {
    if (!this.props.show_close_x) return;
    return (
      <Button
        type="text"
        onClick={() => {
          this.setState({ stdout: "", error: "" });
        }}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          color: "#666",
          fontSize: "10pt",
        }}
      >
        <Icon name="times" />
      </Button>
    );
  }

  render_output(x, style) {
    if (x) {
      return (
        <pre style={style}>
          {this.render_close_x()}
          {x}
        </pre>
      );
    }
  }

  keydown = (e) => {
    // IMPORTANT: if you do window.e and look at e, it's all null!! But it is NOT
    // all null right now -- see
    //     http://stackoverflow.com/questions/22123055/react-keyboard-event-handlers-all-null
    //# e.persist(); window.e = e  # for debugging
    if (e.keyCode === 27) {
      this.setState({ input: "", stdout: "", error: "" });
    }
  };

  render() {
    // We don't use inline, since we still want the full horizontal width.
    return (
      <>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            this.execute_command();
          }}
        >
          <Space.Compact style={{ width: WIDTH, float: "right" }}>
            <Input
              allowClear
              type="text"
              value={this.state.input}
              placeholder="Terminal command..."
              onChange={(e) => {
                e.preventDefault();
                const input = e?.target?.value;
                if (!input) {
                  this.setState({ stdout: "", error: "" });
                }
                if (input == null) return;
                this.setState({ input });
              }}
              onKeyDown={this.keydown}
            />
            {this.render_button()}
          </Space.Compact>
        </form>
        <div style={output_style_miniterm}>
          {this.render_output(this.state.stdout, { margin: 0 })}
          {this.render_output(this.state.error, {
            color: "darkred",
            margin: 0,
          })}
        </div>
      </>
    );
  }
}

export const MiniTerminal: React.FC<Props> = (props) => {
  const student_project_functionality = useStudentProjectFunctionality(
    props.project_id,
  );
  if (student_project_functionality.disableTerminals) {
    return <></>;
  }
  return <MiniTerminal0 {...props} />;
};
