/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Form, Input } from "antd";
import React, { useEffect } from "react";

import { Button } from "@cocalc/frontend/antd-bootstrap";
import { CSS } from "@cocalc/frontend/app-framework";
import { Icon } from "./icon";

interface Props {
  text: string;
  on_change: (value: string) => void;
  type?: "text" | "textarea";
  rows?: number;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  style?: CSS;
}

export const TextInput: React.FC<Props> = React.memo(
  (props: Readonly<Props>) => {
    const {
      text,
      on_change,
      type,
      rows,
      autoFocus,
      onFocus,
      onBlur,
      disabled = false,
      style,
    } = props;

    const inputRef = React.useRef<any>(null);

    const [nextText, setNextText] = React.useState<string>(text);

    useEffect(() => {
      // so when the props change the state stays in sync (e.g., so save button doesn't appear, etc.)
      setNextText(text);
    }, [text]);

    useEffect(() => {
      if (!autoFocus) return;
      inputRef.current.focus({
        cursor: "end",
      });
    }, []);

    function saveChange(event?) {
      event?.preventDefault();
      on_change(nextText);
    }

    function render_save_button() {
      if (nextText != undefined && nextText !== text) {
        return (
          <Form.Item>
            <Button
              style={{ marginBottom: "15px" }}
              bsStyle="success"
              onClick={saveChange}
            >
              <Icon name="save" /> Save
            </Button>
          </Form.Item>
        );
      }
    }

    function render_input() {
      const C = type === "textarea" ? Input.TextArea : Input;

      return (
        <Form.Item>
          <C
            ref={inputRef}
            type={type ?? "text"}
            rows={rows}
            value={nextText ?? text}
            onChange={(e) => setNextText(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
          />
        </Form.Item>
      );
    }

    return (
      <Form name="basic" onFinish={() => saveChange()} style={style}>
        {render_input()}
        {render_save_button()}
      </Form>
    );
  }
);
