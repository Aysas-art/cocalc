/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Panel } from "@cocalc/frontend/antd-bootstrap";
import { useTypedRedux } from "@cocalc/frontend/app-framework";
import {
  Icon,
  LabeledRow,
  Loading,
  SelectorInput,
} from "@cocalc/frontend/components";
import { IS_MACOS } from "@cocalc/frontend/feature";
import keyboardShortcuts from "./keyboard-shortcuts";
import { set_account_table } from "./util";

const KEYBOARD_SHORTCUTS = keyboardShortcuts(IS_MACOS);

const EVALUATE_KEYS = {
  "Shift-Enter": "shift+enter",
  Enter: "enter (shift+enter for newline)",
};

const LABEL_COLS = 8;

export const KeyboardSettings: React.FC = () => {
  const evaluate_key = useTypedRedux("account", "evaluate_key");

  function render_keyboard_shortcuts(): JSX.Element[] {
    const v: JSX.Element[] = [];
    for (const desc in KEYBOARD_SHORTCUTS) {
      const shortcut = KEYBOARD_SHORTCUTS[desc];
      v.push(
        <LabeledRow key={desc} label={desc} label_cols={LABEL_COLS}>
          {shortcut}
        </LabeledRow>,
      );
    }
    return v;
  }

  function eval_change(value): void {
    set_account_table({ evaluate_key: value });
  }

  function render_eval_shortcut(): JSX.Element {
    if (evaluate_key == null) {
      return <Loading />;
    }
    return (
      <LabeledRow label="Sage Worksheet evaluate key" label_cols={LABEL_COLS}>
        <SelectorInput
          options={EVALUATE_KEYS}
          selected={evaluate_key}
          on_change={eval_change}
        />
      </LabeledRow>
    );
  }

  return (
    <Panel
      header={
        <>
          <Icon name="keyboard" /> Keyboard shortcuts
        </>
      }
    >
      {render_keyboard_shortcuts()}
      {render_eval_shortcut()}
    </Panel>
  );
};
