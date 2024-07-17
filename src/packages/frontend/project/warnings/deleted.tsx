/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Alert } from "@cocalc/frontend/antd-bootstrap";
import { Icon } from "@cocalc/frontend/components";

// A warning to put on pages when the project is deleted
export const DeletedProjectWarning: React.FC = () => {
  return (
    <Alert bsStyle="danger" style={{ margin: "15px auto", maxWidth: "900px" }}>
      <h4>
        <Icon name="exclamation-triangle" /> Warning: this project is{" "}
        <strong>deleted!</strong>
      </h4>
      <p>
        If you intend to use this project, you should{" "}
        <strong>undelete it</strong> in project settings.
      </p>
    </Alert>
  );
};
