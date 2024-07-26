/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

export * from "./types";

// The import order here might matters **A LOT**.  Be careful!
import "./handle-anchor-tags";
import "./handle-details-tags";
import "./handle-marks";
import "./handle-close";
import "./handle-open";
import "./handle-children";
import "./handle-no-children";

export { markdown_to_slate } from "./parse";
