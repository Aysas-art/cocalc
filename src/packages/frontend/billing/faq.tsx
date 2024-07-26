/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Component, Rendered } from "../app-framework";
import { A } from "@cocalc/frontend/components";

export class FAQ extends Component {
  public render(): Rendered {
    return (
      <div>
        <a id="faq" />
        <ul style={{ paddingLeft: "20px" }}>
          <li>
            <A href={"https://doc.cocalc.com/billing.html"}>
              Billing, quotas, and upgrades FAQ
            </A>
          </li>
          <li>
            <A href="https://doc.cocalc.com/project-faq.html">
              Questions about projects
            </A>
          </li>
        </ul>
      </div>
    );
  }
}
