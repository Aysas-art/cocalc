/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Frame for working with a plain command line (bash) terminal.
*/

import { Rendered, Component } from "../../app-framework";

interface Props {
  project_id: string;
  path: string;
  font_size: number;
}

export class PlainTerminal extends Component<Props, {}> {
  render(): Rendered {
    return (
      <div>
        Plain Terminal in same directory as ipynb file -- {this.props.path}
      </div>
    );
  }
}
