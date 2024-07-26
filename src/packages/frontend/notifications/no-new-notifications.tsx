/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";

import { Icon } from "../components";
const { Well } = require("react-bootstrap");

export function NoNewNotifications({ text, style }) {
  return (
    <Well style={Object.assign({}, well_style, style)}>
      <Icon name={"bell"} style={{ fontSize: "32px", color: "#a3aab1" }} />
      <h3>{text}.</h3>
    </Well>
  );
}

const well_style: React.CSSProperties = {
  padding: "40px, 30px",
  textAlign: "center",
};
