/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
TODO: there are a bunch of redux props that have very generic
names and happened to all be used by project search. This is,
of course, a disaster waiting to happen.  They all need to
be in a single namespace somehow...!
*/

import { Space as AntdSpace, Button, Card, Col, Row, Switch, Tag } from "antd";

import { Alert, Checkbox, Well } from "@cocalc/frontend/antd-bootstrap";
import { useActions, useTypedRedux } from "@cocalc/frontend/app-framework";
import {
  A,
  HelpIcon,
  Icon,
  Loading,
  SearchInput,
  Space,
} from "@cocalc/frontend/components";
import infoToMode from "@cocalc/frontend/editors/slate/elements/code-block/info-to-mode";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";
import { file_associations } from "@cocalc/frontend/file-associations";
import { CodeMirrorStatic } from "@cocalc/frontend/jupyter/codemirror-static";
import {
  auxFileToOriginal,
  filename_extension,
  path_split,
  path_to_file,
  should_open_in_foreground,
  unreachable,
} from "@cocalc/util/misc";
import { COLORS } from "@cocalc/util/theme";

const RESULTS_WELL_STYLE: React.CSSProperties = {
  backgroundColor: "white",
} as const;

export const ProjectSearchBody: React.FC<{
  project_id: string;
  mode: "project" | "flyout";
  wrap?: Function;
}> = ({ project_id, mode = "project", wrap }) => {
  const subdirectories = useTypedRedux({ project_id }, "subdirectories");
  const case_sensitive = useTypedRedux({ project_id }, "case_sensitive");
  const hidden_files = useTypedRedux({ project_id }, "hidden_files");
  const git_grep = useTypedRedux({ project_id }, "git_grep");
  const neural_search = useTypedRedux({ project_id }, "neural_search");
  const neural_search_enabled = useTypedRedux(
    "customize",
    "neural_search_enabled"
  );

  const actions = useActions({ project_id });

  const isFlyout = mode === "flyout";

  function renderResultList() {
    if (isFlyout) {
      return (
        <ProjectSearchOutput project_id={project_id} wrap={wrap} mode={mode} />
      );
    } else {
      return (
        <Row>
          <Col sm={24}>
            <ProjectSearchOutput project_id={project_id} />
          </Col>
        </Row>
      );
    }
  }

  function renderHeaderProject() {
    return (
      <Row>
        <Col sm={12}>
          <ProjectSearchInput
            project_id={project_id}
            neural={neural_search}
            git={!neural_search && git_grep}
          />
          {mode != "flyout" ? (
            <ProjectSearchOutputHeader project_id={project_id} />
          ) : undefined}
        </Col>
        <Col sm={10} offset={2} style={{ fontSize: "16px" }}>
          <Checkbox
            disabled={neural_search}
            checked={subdirectories}
            onChange={() => actions?.toggle_search_checkbox_subdirectories()}
          >
            <Icon name="folder-open" /> Include <b>subdirectories</b>
          </Checkbox>
          <Checkbox
            disabled={neural_search}
            checked={case_sensitive}
            onChange={() => actions?.toggle_search_checkbox_case_sensitive()}
          >
            <Icon name="font-size" /> <b>Case sensitive</b> search
          </Checkbox>
          <Checkbox
            disabled={neural_search}
            checked={hidden_files}
            onChange={() => actions?.toggle_search_checkbox_hidden_files()}
          >
            <Icon name="eye-slash" /> Include <b>hidden files</b>
          </Checkbox>
          <Checkbox
            disabled={neural_search}
            checked={git_grep}
            onChange={() => actions?.toggle_search_checkbox_git_grep()}
          >
            <Icon name="git" /> <b>Git search</b>: in GIT repo, use "git grep"
            to only search files in the git repo.
          </Checkbox>
          {neural_search_enabled && (
            <Checkbox
              checked={neural_search}
              onChange={() =>
                actions?.setState({ neural_search: !neural_search })
              }
            >
              <Tag color="green" style={{ float: "right" }}>
                New
              </Tag>
              <div>
                <Icon name="robot" /> <b>Neural search</b> using{" "}
                <A href="https://platform.openai.com/docs/guides/embeddings/what-are-embeddings">
                  OpenAI Embeddings
                </A>{" "}
                and <A href="https://qdrant.tech/">Qdrant</A>: search recently
                edited files using a neural network similarity algorithm.
                Indexed file types: jupyter, tasks, chat, whiteboards, and
                slides.
              </div>
            </Checkbox>
          )}
        </Col>
      </Row>
    );
  }

  function renderHeaderFlyout() {
    const divStyle = { cursor: "pointer", padding: "2px 5px" };
    return (
      <AntdSpace style={{ padding: "5px" }} direction="vertical">
        <ProjectSearchInput
          project_id={project_id}
          neural={neural_search}
          git={!neural_search && git_grep}
          small={true}
        />
        <div
          onClick={() => actions?.toggle_search_checkbox_subdirectories()}
          style={divStyle}
        >
          <Switch
            size="small"
            disabled={neural_search}
            checked={subdirectories}
          />{" "}
          <Icon name="folder-open" /> Sub-directories
        </div>
        <div
          onClick={() => actions?.toggle_search_checkbox_case_sensitive()}
          style={divStyle}
        >
          <Switch
            size="small"
            disabled={neural_search}
            checked={case_sensitive}
          />{" "}
          <Icon name="font-size" /> Case-sensitive
        </div>
        <div
          onClick={() => actions?.toggle_search_checkbox_hidden_files()}
          style={divStyle}
        >
          <Switch
            size="small"
            disabled={neural_search}
            checked={hidden_files}
          />{" "}
          <Icon name="eye-slash" /> Hidden files{" "}
          <HelpIcon title="Hidden files">
            On Linux, hidden files start with a dot, e.g., ".bashrc".
          </HelpIcon>
        </div>
        <div
          onClick={() => actions?.toggle_search_checkbox_git_grep()}
          style={divStyle}
        >
          <Switch size="small" disabled={neural_search} checked={git_grep} />{" "}
          <Icon name="git" /> Git search{" "}
          <HelpIcon title="Git search">
            If directory is in a Git repository, uses "git grep" to search for
            files.
          </HelpIcon>
        </div>
        {neural_search_enabled && (
          <div
            onClick={() => actions?.setState({ neural_search: !neural_search })}
            style={divStyle}
          >
            <Switch size="small" checked={neural_search} />{" "}
            <Icon name="robot" /> Neural search <Tag color="green">New</Tag>{" "}
            <HelpIcon title="Neural search">
              This novel search uses{" "}
              <A href="https://platform.openai.com/docs/guides/embeddings/what-are-embeddings">
                OpenAI Embeddings
              </A>{" "}
              and <A href="https://qdrant.tech/">Qdrant</A>. It searches
              recently edited files using a neural network similarity algorithm.
              Indexed file types: jupyter, tasks, chat, whiteboards, and slides.
            </HelpIcon>
          </div>
        )}
      </AntdSpace>
    );
  }

  function renderHeader() {
    switch (mode) {
      case "project":
        return renderHeaderProject();
      case "flyout":
        return renderHeaderFlyout();
      default:
        unreachable(mode);
    }
  }

  function renderContent() {
    return (
      <div
        style={{
          flex: "1 1 auto",
          height: "100%",
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderHeader()}
        {renderResultList()}
      </div>
    );
  }

  if (isFlyout) {
    return (
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {renderContent()}
      </div>
    );
  } else {
    return <Well>{renderContent()}</Well>;
  }
};

interface ProjectSearchInputProps {
  project_id: string;
  neural?: boolean;
  git?: boolean;
  small?: boolean;
}

function ProjectSearchInput({
  neural,
  project_id,
  git,
  small = false,
}: ProjectSearchInputProps) {
  const actions = useActions({ project_id });
  const user_input = useTypedRedux({ project_id }, "user_input");

  return (
    <SearchInput
      size={small ? "medium" : "large"}
      autoFocus={true}
      value={user_input}
      placeholder={`Enter your search ${
        neural ? "(semantic similarity)" : "(supports regular expressions!)"
      }`}
      on_change={(value) => actions?.setState({ user_input: value })}
      on_submit={() => actions?.search()}
      on_clear={() =>
        actions?.setState({
          most_recent_path: undefined,
          command: undefined,
          most_recent_search: undefined,
          search_results: undefined,
          search_error: undefined,
        })
      }
      buttonAfter={
        <Button
          disabled={!user_input?.trim()}
          type="primary"
          onClick={() => actions?.search()}
        >
          {neural ? (
            <>
              <Icon name="robot" />
              {small ? "" : " Neural Search"}
            </>
          ) : git ? (
            <>
              <Icon name="git" />
              {small ? "" : " Git Grep Search"}
            </>
          ) : (
            <>
              <Icon name="search" />
              {small ? "" : " Grep Search"}
            </>
          )}
        </Button>
      }
    />
  );
}

interface ProjectSearchOutputProps {
  project_id: string;
  wrap?: Function;
  mode?: "project" | "flyout";
}

function ProjectSearchOutput({
  project_id,
  wrap,
  mode = "project",
}: ProjectSearchOutputProps) {
  const isFlyout = mode === "flyout";
  const most_recent_search = useTypedRedux(
    { project_id },
    "most_recent_search"
  );
  const most_recent_path = useTypedRedux({ project_id }, "most_recent_path");
  const search_results = useTypedRedux({ project_id }, "search_results");
  const search_error = useTypedRedux({ project_id }, "search_error");
  const too_many_results = useTypedRedux({ project_id }, "too_many_results");

  if (most_recent_search == null || most_recent_path == null) {
    return <span />;
  }

  if (search_results == null && search_error == null) {
    if (most_recent_search != null) {
      // a search has been made but the search_results or
      // search_error hasn't come in yet
      return <Loading />;
    }
    return <span />;
  }

  function render_get_results() {
    if (search_error != null) {
      return (
        <Alert bsStyle="warning">
          Search error: {search_error} Please try a different type of search or
          a more restrictive search.
        </Alert>
      );
    }
    if (search_results?.size == 0) {
      return (
        <Alert bsStyle="warning" banner={true}>
          There were no results for your search.
        </Alert>
      );
    }
    const v: JSX.Element[] = [];
    let i = 0;
    for (const result of search_results) {
      v.push(
        <ProjectSearchResultLine
          key={i}
          project_id={project_id}
          filename={result.get("filename")}
          description={result.get("description")}
          line_number={result.get("line_number")}
          fragment_id={result.get("fragment_id")?.toJS()}
          most_recent_path={most_recent_path}
          mode={mode}
        />
      );
      i += 1;
    }
    return v;
  }

  function renderResultList() {
    if (isFlyout) {
      return wrap?.(
        <AntdSpace
          direction="vertical"
          size="small"
          style={{
            flex: "1 1 auto",
            width: "100%",
          }}
        >
          {render_get_results()}
        </AntdSpace>,
        { borderTop: `1px solid ${COLORS.GRAY_L}` }
      );
    } else {
      return <Well style={RESULTS_WELL_STYLE}>{render_get_results()}</Well>;
    }
  }

  return (
    <>
      {too_many_results && (
        <Alert bsStyle="warning" banner={true} style={{ margin: "15px 0" }}>
          There were more results than displayed below. Try making your search
          more specific.
        </Alert>
      )}
      {renderResultList()}
    </>
  );
}

function ProjectSearchOutputHeader({ project_id }: { project_id: string }) {
  const actions = useActions({ project_id });
  const info_visible = useTypedRedux({ project_id }, "info_visible");
  const search_results = useTypedRedux({ project_id }, "search_results");
  const command = useTypedRedux({ project_id }, "command");
  const most_recent_search = useTypedRedux(
    { project_id },
    "most_recent_search"
  );
  const most_recent_path = useTypedRedux({ project_id }, "most_recent_path");

  function output_path() {
    return !most_recent_path ? <Icon name="home" /> : most_recent_path;
  }

  function render_get_info() {
    return (
      <Alert bsStyle="info" style={{ margin: "15px 0" }}>
        <ul>
          <li>
            Search command (in a terminal): <pre>{command}</pre>
          </li>
          <li>
            Number of results:{" "}
            {search_results ? search_results?.size : <Loading />}
          </li>
        </ul>
      </Alert>
    );
  }

  if (most_recent_search == null || most_recent_path == null) {
    return <span />;
  }
  return (
    <div style={{ wordWrap: "break-word" }}>
      <div style={{ color: COLORS.GRAY_M, marginTop: "10px" }}>
        <a
          onClick={() => actions?.set_active_tab("files")}
          style={{ cursor: "pointer" }}
        >
          Navigate to a different folder
        </a>{" "}
        to search in it.
      </div>

      <h4>
        Results of searching in {output_path()} for "{most_recent_search}"
        <Space />
        <Button
          onClick={() =>
            actions?.setState({
              info_visible: !info_visible,
            })
          }
        >
          <Icon name="info-circle" /> How this works...
        </Button>
      </h4>

      {info_visible && render_get_info()}
    </div>
  );
}

const DESC_STYLE: React.CSSProperties = {
  color: COLORS.GRAY_M,
  marginBottom: "5px",
  border: "1px solid #eee",
  borderRadius: "5px",
  maxHeight: "300px",
  padding: "15px",
  overflowY: "auto",
} as const;

interface ProjectSearchResultLineProps {
  project_id: string;
  filename: string;
  description: string;
  line_number: number;
  fragment_id: string;
  most_recent_path: string;
  mode?: "project" | "flyout";
}

function ProjectSearchResultLine(_: Readonly<ProjectSearchResultLineProps>) {
  const {
    project_id,
    filename,
    description,
    line_number,
    fragment_id,
    most_recent_path,
    mode = "project",
  } = _;
  const isFlyout = mode === "flyout";
  const actions = useActions({ project_id });
  const ext = filename_extension(filename);
  const icon = file_associations[ext]?.icon ?? "file";

  async function click_filename(e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    let chat;
    let path = path_to_file(most_recent_path, filename);
    const { tail } = path_split(path);
    if (tail.startsWith(".") && tail.endsWith(".sage-chat")) {
      // special case of chat
      path = auxFileToOriginal(path);
      chat = true;
    } else {
      chat = false;
    }
    await actions?.open_file({
      path,
      foreground: should_open_in_foreground(e),
      fragmentId: fragment_id ?? { line: line_number ?? 0 },
      chat,
    });
  }

  function renderFileLink() {
    return (
      <a onClick={click_filename} href="">
        <Icon name={icon} style={{ marginRight: "5px" }} />{" "}
        <strong>{filename}</strong>
      </a>
    );
  }

  if (isFlyout) {
    return (
      <Card
        size="small"
        title={renderFileLink()}
        style={{ marginRight: "5px", marginLeft: "5px", overflow: "hidden" }}
        hoverable={true}
        onClick={click_filename}
      >
        <Snippet
          ext={ext}
          value={description}
          style={{ color: COLORS.GRAY_D, fontSize: "80%" }}
        />
      </Card>
    );
  } else {
    return (
      <div style={{ wordWrap: "break-word", marginBottom: "30px" }}>
        {renderFileLink()}
        <div style={DESC_STYLE}>
          <Snippet ext={ext} value={description} />
        </div>
      </div>
    );
  }
}

const MARKDOWN_EXTS = ["tasks", "slides", "board", "sage-chat"] as const;

function Snippet({
  ext,
  value,
  style,
}: {
  ext: string;
  value: string;
  style?: React.CSSProperties;
}) {
  if (MARKDOWN_EXTS.includes(ext as any)) {
    return <StaticMarkdown value={value} style={style} />;
  }
  return (
    <CodeMirrorStatic
      no_border
      options={{ mode: infoToMode(ext) }}
      value={value}
      style={style}
    />
  );
}
