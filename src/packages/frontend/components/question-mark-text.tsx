/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tip, NoWrap } from ".";

export const QuestionMarkText: React.FC<{ children; tip }> = ({
  children,
  tip,
}) => {
  return (
    <Tip tip={tip}>
      <NoWrap>
        {children} <QuestionCircleOutlined />
      </NoWrap>
    </Tip>
  );
};
