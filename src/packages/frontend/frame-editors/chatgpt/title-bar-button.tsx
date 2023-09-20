/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
A ChatGPT component that allows users to interact with OpenAI's language model
for several text and code related function.  This calls the chatgpt actions
to do the work.
*/

import { Alert, Button, Input, Popover, Radio, Space, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, IconName, VisibleMDLG } from "@cocalc/frontend/components";
import OpenAIAvatar from "@cocalc/frontend/components/openai-avatar";
import { COLORS } from "@cocalc/util/theme";
import { capitalize } from "@cocalc/util/misc";
import TitleBarButtonTour from "./title-bar-button-tour";
import ModelSwitch, { modelToName, Model } from "./model-switch";
import Context from "./context";

interface Preset {
  command: string;
  codegen: boolean;
  tag: string;
  icon: IconName;
  label: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    command: "Fix all errors in",
    codegen: true,
    tag: "fix-errors",
    icon: "bug",
    label: "Fix Errors",
    description: "Explain how to fix any mistakes it can find.",
  },
  {
    command: "Finish writing this",
    codegen: true,
    tag: "complete",
    icon: "pen",
    label: "Autocomplete",
    description:
      "Finish writing this. ChatGPT can automatically write code, finish a poem, and much more.  The output is in chat so your file isn't directly modified.",
  },
  {
    command: "Explain in detail how this code works",
    codegen: false,
    tag: "explain",
    icon: "bullhorn",
    label: "Explain",
    description:
      "Explains this in detail. For example, you can select some code and will try to explain line by line how it works.",
  },
  {
    command: "Review for quality and correctness and suggest improvements",
    codegen: false,
    tag: "review",
    icon: "eye",
    label: "Review",
    description:
      "Review this for correctness and quality and suggest improvements.",
  },
  {
    command: "Add comments to",
    codegen: true,
    tag: "comment",
    icon: "comment",
    label: "Add Comments",
    description:
      "Tell you how to add comments so this is easier to understand.",
  },
  {
    command: "Summarize",
    codegen: false,
    tag: "summarize",
    icon: "bolt",
    label: "Summarize",
    description: "Write a summary of this.",
  },
];

const CUSTOM_DESCRIPTIONS = {
  terminal:
    "Describe anything you might want to do in the Linux terminal: find files that contain 'foo', replace 'x' by 'y' in all files, clone a git repo, convert a.ipynb to markdown, etc.",
  jupyter_cell_notebook:
    "Try to do anything with the current cell or selection that you can possibly imagine: explain why this is slow and how to make it faster, draw a plot of sin(x), etc.",
  generic: (
    <div>
      You can try anything that you can possibly imagine: translate from one
      programming language to another, explain why code is slow, show the steps
      to solve an equation, etc.
    </div>
  ),
};

function getCustomDescription(frameType) {
  return CUSTOM_DESCRIPTIONS[frameType] ?? CUSTOM_DESCRIPTIONS["generic"];
}

interface Props {
  id: string;
  actions;
  buttonSize;
  buttonStyle;
  labels?: boolean;
  visible?: boolean;
  path: string;
  buttonRef;
}

import type { Scope } from "./types";

export default function ChatGPT({
  id,
  actions,
  buttonSize,
  buttonStyle,
  labels,
  visible,
  path,
  buttonRef,
}: Props) {
  const [showChatGPT, setShowChatGPT] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [custom, setCustom] = useState<string>("");
  const frameType = actions._get_frame_type(id);
  const [querying, setQuerying] = useState<boolean>(false);
  const [tag, setTag] = useState<string>("");
  const showOptions = frameType != "terminal";
  const [input, setInput] = useState<string>("");
  const [truncated, setTruncated] = useState<number>(0);
  const [truncatedReason, setTruncatedReason] = useState<string>("");
  const [scope, setScope] = useState<Scope | "all">(() =>
    showChatGPT ? getScope(id, actions) : "all"
  );
  const describeRef = useRef<any>(null);
  const buttonsRef = useRef<any>(null);
  const scopeRef = useRef<any>(null);
  const contextRef = useRef<any>(null);
  const submitRef = useRef<any>(null);
  const [model, setModel] = useState<Model>("gpt-3.5-turbo");

  useEffect(() => {
    if (showChatGPT) {
      setScope(getScope(id, actions));
    }
  }, [showChatGPT]);

  const scopeOptions = useMemo(() => {
    const options: { label: string; value: Scope }[] = [];
    const available = actions.chatgptGetScopes();
    for (const value of available) {
      options.push({ label: capitalize(value), value });
    }
    options.push({ label: "All", value: "all" });
    options.push({ label: "None", value: "none" });
    if (scope != "all" && scope != "none" && !available.has(scope)) {
      setScope("all");
    }
    return options;
  }, [actions]);

  const doUpdateInput = async () => {
    if (!(visible && showChatGPT)) {
      // don't waste time on update if it is not visible.
      return;
    }
    const { input, inputOrig } = await updateInput(actions, id, scope, model);
    setInput(input);
    setTruncated(
      Math.round(
        100 *
          (1 -
            (inputOrig.length - input.length) / Math.max(1, inputOrig.length))
      )
    );
    setTruncatedReason(
      `Input truncated from ${inputOrig.length} to ${input.length} characters.${
        model == "gpt-3.5-turbo"
          ? "  Try using a different model with a bigger context size."
          : ""
      }`
    );
  };

  useEffect(() => {
    doUpdateInput();
  }, [id, scope, visible, path, showChatGPT, model]);

  const [description, setDescription] = useState<string>(
    showOptions ? "" : getCustomDescription(frameType)
  );

  const chatgpt = async (options) => {
    setError("");
    try {
      setQuerying(true);
      await actions.chatgpt(id, options, input);
      setCustom("");
    } catch (err) {
      setError(`${err}`);
    } finally {
      setQuerying(false);
    }
  };

  const doIt = () => {
    if (custom.trim()) {
      chatgpt({
        command: custom.trim(),
        codegen: false,
        allowEmpty: true,
        model,
        tag: "custom",
      });
      return;
    }
    for (const preset of PRESETS) {
      if (preset.tag == tag) {
        chatgpt(preset);
        break;
      }
    }
    setShowChatGPT(false);
    setError("");
    actions.focus();
  };

  return (
    <Popover
      title={
        <div style={{ fontSize: "18px" }}>
          <OpenAIAvatar size={24} style={{ marginRight: "5px" }} />
          <ModelSwitch size="small" model={model} setModel={setModel} /> What
          would you like to do using {modelToName(model)}?
          <Button
            onClick={() => {
              setShowChatGPT(false);
              setError("");
              actions.focus();
            }}
            type="text"
            style={{ float: "right", color: COLORS.GRAY_M }}
          >
            <Icon name="times" />
          </Button>
          <div style={{ float: "right" }}>
            <TitleBarButtonTour
              describeRef={describeRef}
              buttonsRef={buttonsRef}
              scopeRef={scopeRef}
              contextRef={contextRef}
              submitRef={submitRef}
            />
          </div>
        </div>
      }
      open={visible && showChatGPT}
      content={() => {
        return (
          <Space
            direction="vertical"
            style={{ width: "800px", maxWidth: "90vw" }}
          >
            <div ref={describeRef}>
              <Input.TextArea
                allowClear
                autoFocus
                style={{ flex: 1 }}
                placeholder={"What you want to do..."}
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setTag("");
                  if (e.target.value) {
                    setDescription(getCustomDescription(frameType));
                  } else {
                    setDescription("");
                  }
                }}
                onPressEnter={(e) => {
                  if (e.shiftKey) {
                    doIt();
                  }
                }}
                autoSize={{ minRows: 2, maxRows: 10 }}
              />
            </div>
            {showOptions && (
              <>
                <div
                  ref={buttonsRef}
                  style={{ overflowX: "auto", textAlign: "center" }}
                >
                  or{" "}
                  <Button.Group style={{ marginLeft: "5px" }}>
                    {PRESETS.map((preset) => (
                      <Button
                        type={preset.tag == tag ? "primary" : undefined}
                        key={preset.tag}
                        onClick={() => {
                          setTag(preset.tag);
                          setDescription(preset.description);
                          setCustom(preset.command);
                        }}
                        disabled={querying}
                      >
                        <Icon name={preset.icon} />
                        {preset.label}
                      </Button>
                    ))}
                  </Button.Group>
                </div>
              </>
            )}
            {showOptions && (
              <div
                style={{
                  marginTop: "5px",
                  color: "#444",
                  maxHeight: "40vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ marginBottom: "5px" }} ref={scopeRef}>
                  {truncated < 100 ? (
                    <Tooltip title={truncatedReason}>
                      <div style={{ float: "right" }}>
                        Truncated ({truncated}% remains)
                      </div>
                    </Tooltip>
                  ) : (
                    <div style={{ float: "right" }}>
                      NOT Truncated (100% included)
                    </div>
                  )}
                  ChatGPT will see:
                  <Radio.Group
                    size="small"
                    style={{ margin: "0 10px" }}
                    value={scope}
                    onChange={(e) => {
                      const scope = e.target.value;
                      setScope(scope);
                    }}
                    options={scopeOptions}
                    optionType="button"
                    buttonStyle="solid"
                  />
                  <Button size="small" type="text" onClick={doUpdateInput}>
                    <Icon name="refresh" /> Update
                  </Button>
                </div>
                <div ref={contextRef} style={{ overflowY: "auto" }}>
                  <Context value={input} info={actions.chatgptGetLanguage()} />
                </div>
              </div>
            )}{" "}
            {description}
            <div style={{ textAlign: "center" }} ref={submitRef}>
              <Button
                disabled={querying || (!tag && !custom.trim())}
                type="primary"
                size="large"
                onClick={doIt}
              >
                <Icon
                  name={querying ? "spinner" : "paper-plane"}
                  spin={querying}
                />{" "}
                Ask {modelToName(model)} (shift+enter)
              </Button>
            </div>
            {error && <Alert type="error" message={error} />}
          </Space>
        );
      }}
    >
      <Button
        style={buttonStyle}
        size={buttonSize}
        onClick={() => {
          setError("");
          setShowChatGPT(!showChatGPT);
          actions.blur();
        }}
      >
        <span ref={buttonRef}>
          <Tooltip title="Get assistance from ChatGPT">
            <OpenAIAvatar size={20} style={{ marginTop: "-5px" }} />{" "}
          </Tooltip>
          <VisibleMDLG>{labels ? "ChatGPT..." : undefined}</VisibleMDLG>
        </span>
      </Button>
    </Popover>
  );
}

async function updateInput(
  actions,
  id,
  scope,
  model
): Promise<{ input: string; inputOrig: string }> {
  if (scope == "none") {
    return { input: "", inputOrig: "" };
  }
  let input = actions.chatgptGetContext(id, scope);
  const inputOrig = input;
  if (input.length > 2000) {
    // Truncate input (also this MUST be a lazy import):
    const { truncateMessage, getMaxTokens } = await import(
      "@cocalc/frontend/misc/openai"
    );
    const maxTokens = getMaxTokens(model) - 1000; // 1000 tokens reserved for output and the prompt below.
    input = truncateMessage(input, maxTokens);
  }
  return { input, inputOrig };
}

function getScope(id, actions): Scope {
  const scopes = actions.chatgptGetScopes();
  // don't know: selection if something is selected; otherwise,
  // ballback below.
  if (
    scopes.has("selection") &&
    actions.chatgptGetContext(id, "selection")?.trim()
  ) {
    return "selection";
  }
  if (scopes.has("page")) return "page";
  if (scopes.has("cell")) return "cell";
  return "all";
}
