/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";
import { Icon } from "../components/icon";

// TODO: maybe clicking to reveal.
// This is just an mvp. See https://github.com/sagemathinc/cocalc/issues/3835

interface Props {
  title: string;
}

export const CellHiddenPart: React.FC<Props> = (props: Props) => {
  return (
    <div
      style={{ color: "#aaa", fontSize: "14pt", paddingLeft: "15px" }}
      title={props.title}
    >
      <Icon name={"ellipsis"} />
    </div>
  );
};
