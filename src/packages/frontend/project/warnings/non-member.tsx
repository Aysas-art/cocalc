/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */


import { Alert } from "../../antd-bootstrap";
import { plural } from "@cocalc/util/misc";
import { A, Icon, Gap } from "../../components";
import { Options, project_warning_opts } from "./util";
import { PolicyPricingPageUrl } from "../../customize";

export const NonMemberProjectWarning: React.FC<Options> = (opts) => {
  const { total, avail } = project_warning_opts(opts);

  let suggestion;

  if (avail > 0) {
    // have upgrade available
    suggestion = (
      <span>
        <b>
          <i>
            You have {avail} unused members-only hosting{" "}
            {plural(avail, "upgrade")}
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
          Your {total} members-only hosting {plural(total, "upgrade")} are
          already in use on other projects. You can{" "}
          <A href={url}>
            purchase further upgrades{" "}
          </A>{" "}
          by adding a subscription (you can add the same subscription multiple
          times), or disable member-only hosting for another project to free a
          spot up for this one.
        </span>
      );
    } else {
      suggestion = (
        <span>
          <Gap />
          <A href={url}>
            Licenses start at about $3/month...
          </A>
        </span>
      );
    }
  }

  return (
    <Alert bsStyle="warning" style={{ margin: "15px" }}>
      <h4>
        <Icon name="exclamation-triangle" /> Warning: this project is{" "}
        <strong>running on a free server</strong>
      </h4>
      <p>
        <Gap />
        Projects running on free servers compete for resources with a large
        number of other free projects. The free servers are{" "}
        <b>
          <i>randomly rebooted frequently</i>
        </b>
        , and are often{" "}
        <b>
          <i>much more heavily loaded</i>
        </b>{" "}
        than member-only servers. {suggestion}
      </p>
    </Alert>
  );
};
