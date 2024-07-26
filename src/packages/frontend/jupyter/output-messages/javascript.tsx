/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { List } from "immutable";
import $ from "jquery";
import React, { useRef, useState } from "react";
import { is_array } from "@cocalc/util/misc";
import { javascript_eval } from "./javascript-eval";
import { STDERR_STYLE } from "./style";

interface JavascriptProps {
  value: string | List<string>;
}

// ATTN: better don't memoize this, since JS code evaluation happens when this is mounted
export const Javascript: React.FC<JavascriptProps> = (
  props: JavascriptProps
) => {
  const { value } = props;

  const node = useRef<HTMLDivElement>(null);

  const [errors, set_errors] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (value == null || node.current == null) {
      return;
    }
    const element = $(node.current);
    let blocks: string[];
    if (typeof value == "string") {
      blocks = [value];
    } else {
      const x = value.toJS();
      if (!is_array(x)) {
        console.warn("not evaluating javascript since wrong type:", x);
        return;
      } else {
        blocks = x;
      }
    }
    let block: string;
    let errors: string = "";
    for (block of blocks) {
      errors += javascript_eval(block, element);
      if (errors.length > 0) {
        set_errors(errors);
      }
    }
  }, [value]);

  if (errors) {
    // This conflicts with official Jupyter
    return (
      <div style={STDERR_STYLE}>
        <span>
          {errors}
          <br />
          See your browser Javascript console for more details.
        </span>
      </div>
    );
  } else {
    return <div ref={node} />;
  }
};
