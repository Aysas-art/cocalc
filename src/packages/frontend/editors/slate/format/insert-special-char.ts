/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Transforms } from "slate";
import {
  get_insert_special_char_from_user,
  Options,
} from "@cocalc/frontend/codemirror/extensions/insert-special-char";
import { alert_message } from "@cocalc/frontend/alerts";
import { getFocus } from "./commands";

export async function insertSpecialChar(editor): Promise<void> {
  let opts: Options | undefined = undefined;
  try {
    opts = await get_insert_special_char_from_user();
  } catch (err) {
    alert_message({ type: "error", message: err.errorFields[0]?.errors });
    return;
  }
  if (opts == null) return; // user canceled.
  // We insert at what is likely the focus, rather than trying to
  // focus, since focusing is erratic (especially with firefox).
  Transforms.insertText(editor, opts.char, { at: getFocus(editor) });
}
