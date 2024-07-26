/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";
import { RenderElementProps } from "./slate-react";
import { getRender } from "./elements";

export const Element: React.FC<RenderElementProps> = (props) => {
  const Component = getRender(props.element["type"]);
  return React.createElement(Component, props);
};
