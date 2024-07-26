/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import React from "react";
import { STDOUT_STYLE } from "./style";

interface TextPlainProps {
  value: string;
}

export const TextPlain: React.FC<TextPlainProps> = (props: TextPlainProps) => {
  const { value } = props;

  // span? -- see https://github.com/sagemathinc/cocalc/issues/1958
  return (
    <div style={STDOUT_STYLE}>
      <span>{value}</span>
    </div>
  );
};
