/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Alert } from "../../antd-bootstrap";
import { plural } from "@cocalc/util/misc";
import { A, Icon, Gap } from "../../components";
import { Options, project_warning_opts } from "./util";
import { PolicyPricingPageUrl } from "../../customize";
import { LICENSE_MIN_PRICE } from "@cocalc/util/consts/billing";

export const NoNetworkProjectWarning: React.FC<Options> = (props) => {
  let suggestion;
  const { total, avail } = project_warning_opts(props);
  if (avail > 0) {
    // have upgrade available
    suggestion = (
      <span>
        <b>
          <i>
            You have {avail} unused internet access {plural(avail, "upgrade")}
          </i>
        </b>
        . Click 'Adjust your upgrade contributions...' below.
      </span>
    );
  } else if (avail <= 0) {
    const url = PolicyPricingPageUrl;
    if (total > 0) {
      suggestion = (
        <span>
          Your {total} internet access {plural(total, "upgrade")} are already in
          use on other projects. You can{" "}
          <A href={url}>purchase further upgrades </A> by adding a subscription
          (you can add the same subscription multiple times), or disable an
          internet access upgrade for another project to free a spot up for this
          one.
        </span>
      );
    } else {
      suggestion = (
        <span>
          <Gap />
          <A href={url}>Licenses start at {LICENSE_MIN_PRICE}...</A>
        </span>
      );
    }
  }

  return (
    <Alert bsStyle="warning" style={{ margin: "15px" }}>
      <h4>
        <Icon name="exclamation-triangle" /> Warning: this project{" "}
        <strong>does not have full internet access</strong>
      </h4>
      <p>
        Projects without internet access enabled cannot connect to external
        websites, download software packages, or invite and notify collaborators
        via email.
        {suggestion}
      </p>
    </Alert>
  );
};
