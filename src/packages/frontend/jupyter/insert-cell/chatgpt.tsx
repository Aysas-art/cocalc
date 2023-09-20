import OpenAIAvatar from "@cocalc/frontend/components/openai-avatar";
import { Button, Input, Popover, Space, Typography } from "antd";
const { Paragraph } = Typography;
import ModelSwitch, {
  modelToName,
  Model,
  DEFAULT_MODEL,
} from "@cocalc/frontend/frame-editors/chatgpt/model-switch";
import { Icon } from "@cocalc/frontend/components/icon";
import { useMemo, useState } from "react";
import { COLORS } from "@cocalc/util/theme";
import { insertCell } from "./util";
import { useFrameContext } from "@cocalc/frontend/app-framework";
import { throttle } from "lodash";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { alert_message } from "@cocalc/frontend/alerts";
import track from "@cocalc/frontend/user-tracking";
import StaticMarkdown from "@cocalc/frontend/editors/slate/static-markdown";

export default function ChatGPT({
  setShowChatGPT,
  showChatGPT,
  children,
  actions,
  frameActions,
  id,
  position,
}) {
  const [model, setModel] = useState<Model>(DEFAULT_MODEL);
  const [querying, setQuerying] = useState<boolean>(false);
  const { project_id, path } = useFrameContext();
  const [prompt, setPrompt] = useState<string>("");
  const input = useMemo(() => {
    if (!showChatGPT) return "";
    const { input } = getInput({
      frameActions,
      prompt,
      actions,
      id,
      position,
    });
    return input;
  }, [showChatGPT, prompt]);

  return (
    <Popover
      placement="bottom"
      title={() => (
        <div style={{ fontSize: "18px" }}>
          <OpenAIAvatar size={24} /> Generate code cell using{" "}
          <ModelSwitch size="small" model={model} setModel={setModel} />
          <Button
            onClick={() => {
              setShowChatGPT(false);
            }}
            type="text"
            style={{ float: "right", color: COLORS.GRAY_M }}
          >
            <Icon name="times" />
          </Button>
        </div>
      )}
      open={showChatGPT}
      content={() => (
        <div style={{ width: "500px", maxWidth: "90vw" }}>
          <>
            <Paragraph>Describe what the new cell should do.</Paragraph>
            <Paragraph>
              <Input.TextArea
                allowClear
                autoFocus
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                }}
                disabled={querying}
                placeholder="Describe the new cell..."
                onPressEnter={(e) => {
                  if (!e.shiftKey) return;
                  queryChatGPT({
                    frameActions,
                    actions,
                    id,
                    position,
                    setQuerying,
                    model,
                    project_id,
                    path,
                    prompt,
                  });
                }}
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Paragraph>
            The following will be sent to {modelToName(model)}:
            <StaticMarkdown
              value={input}
              style={{
                border: "1px solid lightgrey",
                borderRadius: "5px",
                margin: "5px 0",
                padding: "10px",
                overflowY: "auto",
                maxHeight: "150px",
              }}
            />
            <Paragraph style={{ textAlign: "center", marginTop: "30px" }}>
              <Space size="large">
                <Button onClick={() => setShowChatGPT(false)}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    queryChatGPT({
                      frameActions,
                      actions,
                      id,
                      position,
                      setQuerying,
                      model,
                      project_id,
                      path,
                      prompt,
                    });
                  }}
                  disabled={querying || !prompt.trim()}
                >
                  <Icon name={"paper-plane"} /> Generate Using{" "}
                  {modelToName(model)} (shift+enter)
                </Button>
              </Space>
            </Paragraph>
          </>
        </div>
      )}
      trigger={[]}
    >
      {children}
    </Popover>
  );
}

/**
 * extract the code between the first and second occurance of lines starting with backticks
 * TODO: cocalc has a markdown parser and is very good at parsing markdown (e.g., slate uses that),
 * and we should obviously using that instead of an adhoc parsing that will break on some inputs,
 * e.g., triple backticks is not ALWAYS the code delimiter (it can be spaces, it can be more than 3
 * backticks).
 */
function extractCode(raw: string): {
  content: string;
  type: "code" | "markdown";
} {
  const ret: string[] = [];
  let inside = false;
  let haveCode = false;
  for (const line of raw.split("\n")) {
    if (line.startsWith("```")) {
      inside = true;
      continue;
    }
    if (inside) {
      // ignore the remaining lines
      if (line.startsWith("```")) break;
      ret.push(line);
      haveCode = true;
    }
  }

  // if there is nothing in "ret", it probably returned a comment explaining it does not know what to do
  if (ret.length > 0) {
    return {
      content: ret.join("\n"),
      type: haveCode ? "code" : "markdown",
    };
  } else {
    return { content: raw, type: "markdown" };
  }
}

async function queryChatGPT({
  frameActions,
  actions,
  setQuerying,
  id,
  position,
  model,
  project_id,
  path,
  prompt,
}) {
  if (!prompt.trim()) return;
  const { input, lang } = getInput({
    frameActions,
    prompt,
    actions,
    id,
    position,
  });
  if (!input) {
    return;
  }

  try {
    setQuerying(true);
    const tag = "generate-jupyter-cell";
    track("chatgpt", { project_id, path, tag, type: "generate", model });

    // This is here to make it clear this was generated by GPT.
    // It could also be a comment in the code cell but for that we would need to know how the
    // comment character is in the language.
    const noteCellId = insertCell({
      frameActions,
      actions,
      id,
      position,
      type: "markdown",
      content: `The following cell was generated by ${modelToName(
        model
      )} using this user prompt:\n\n> ${prompt}\n\n `,
    });
    if (!noteCellId) {
      throw Error("unable to insert cell");
    }
    const fa = frameActions.current;
    if (fa == null) {
      throw Error("frame actions must be defined");
    }
    const gptCellId = insertCell({
      frameActions,
      actions,
      type: "markdown",
      content: ":robot: thinking…",
      id: noteCellId,
      position: "below",
    });
    fa.set_mode("escape"); // while tokens come in ...
    if (gptCellId == null) return; // to make TS happy

    const reply = await webapp_client.openai_client.chatgptStream({
      input,
      project_id,
      path,
      system: `Return a single code block in the language "${lang}".`,
      tag,
      model,
    });

    const updateCell = throttle(
      function (answer) {
        const { content, type } = extractCode(answer);
        fa.set_cell_input(gptCellId, content);
        actions.set_cell_type(gptCellId, type);
      },
      750,
      { leading: true, trailing: true }
    );

    let answer = "";
    reply.on("token", (token) => {
      if (token != null) {
        answer += token;
        updateCell(answer);
      } else {
        fa.switch_code_cell_to_edit(gptCellId);
      }
    });
    reply.on("error", (err) => {
      fa.set_cell_input(
        gptCellId,
        `# Error generating code cell\n\n\`\`\`\n${err}\n\`\`\`\n\nOpenAI [status](https://status.openai.com) and [downdetector](https://downdetector.com/status/openai).`
      );
      actions.set_cell_type(gptCellId, "markdown");
      fa.set_mode("escape");
      return;
    });
  } catch (err) {
    alert_message({
      type: "error",
      title: "Problem generating code cell",
      message: `${err}`,
    });
  } finally {
    setQuerying(false);
  }
}

function getInput({ frameActions, prompt, actions, id, position }): {
  input: string;
  lang: string;
} {
  if (!prompt?.trim()) {
    return { input: "", lang: "" };
  }
  if (frameActions.current == null) {
    console.warn(
      "Unable to create cell due to frameActions not being defined."
    );
    return { input: "", lang: "" };
  }
  const kernel_info = actions.store.get("kernel_info");
  const lang = kernel_info?.get("language") ?? "python";
  const kernel_name = kernel_info?.get("display_name") ?? "Python 3";
  const prevCodeContents = getPreviousNonemptyCodeCellContents(
    frameActions.current,
    id,
    position
  );
  const prevCode = prevCodeContents
    ? `The previous code cell is\n\n\`\`\`${lang}\n${prevCodeContents}\n\`\`\``
    : "";

  const input = `Create a new code cell for a Jupyter Notebook.\n\nKernel: "${kernel_name}".\n\nProgramming language: "${lang}".\n\nReturn the entire code cell in a single block. Enclosed this block in triple backticks. Do not say what the output will be. Add comments as code comments. ${prevCode}\n\nThe new cell should do the following:\n\n${prompt}`;
  return { input, lang };
}

function getPreviousNonemptyCodeCellContents(actions, id, position): string {
  let delta = position == "below" ? 0 : -1;
  while (true) {
    const prevId = actions.getPreviousCodeCellID(id, delta);
    if (!prevId) return "";
    const code = actions.get_cell_input(prevId)?.trim();
    if (code) {
      return code;
    }
    delta -= 1;
  }
}
