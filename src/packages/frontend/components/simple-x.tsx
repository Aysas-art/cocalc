/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { Icon } from "./icon";

interface Props {
  onClick: () => void;
}

export function SimpleX({ onClick }: Props) {
  return (
    <a
      href=""
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <Icon name="times" />
    </a>
  );
}
