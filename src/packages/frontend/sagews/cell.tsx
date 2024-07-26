/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Rendering a Sage worksheet cell
*/

import CellInput from "./input";
import CellOutput from "./output";
import type { OutputMessages } from "./parse-sagews";

interface Props {
  input: string;
  output: OutputMessages;
  flags: string;
}

export default function Cell({ input, output, flags }: Props) {
  return (
    <div>
      <CellInput input={input} flags={flags} />
      {output && <CellOutput output={output} flags={flags} />}
    </div>
  );
}
