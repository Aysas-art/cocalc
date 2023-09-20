/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { redux } from "../app-framework";
import { Alert } from "../antd-bootstrap";
import { Icon } from "./icon";
import { Gap } from "./gap";

export const LoginLink: React.FC = () => {
  return (
    <Alert bsStyle="info" style={{ margin: "15px" }}>
      <Icon name="sign-in" style={{ fontSize: "13pt", marginRight: "10px" }} />{" "}
      Please
      <Gap />
      <a
        style={{ cursor: "pointer" }}
        onClick={() => redux.getActions("page").set_active_tab("account")}
      >
        login or create an account...
      </a>
    </Alert>
  );
};
