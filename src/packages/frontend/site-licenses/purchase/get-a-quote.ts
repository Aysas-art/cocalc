/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import openSupportTab from "@cocalc/frontend/support/open";

export function create_quote_support_ticket(info: object): void {
  const subject = "Request for a quote";
  const body = `Hello,\n\nI would like to request a quote.  I filled out the online form with the\ndetails listed below:\n\n\`\`\`\n${JSON.stringify(
    info,
    undefined,
    2
  )}\n\`\`\``;
  const type = "question";
  openSupportTab({ subject, body, type, hideExtra: true });
}
