/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Terminal server
*/

import { getLogger } from "@cocalc/backend/logger";
import type { Options, PrimusChannel, PrimusWithChannels } from "./lib/types";
export { PrimusChannel, PrimusWithChannels };
import { getChannelName, getRemotePtyChannelName } from "./lib/util";
import { Terminal } from "./lib/terminal";
export { RemoteTerminal } from "./lib/remote-terminal";
export { getRemotePtyChannelName };
import { EventEmitter } from "events";

const logger = getLogger("terminal:index");

const terminals: { [name: string]: Terminal } = {};

class Terminals extends EventEmitter {
  private paths: { [path: string]: true } = {};

  getOpenPaths = (): string[] => Object.keys(this.paths);

  isOpen = (path) => this.paths[path] != null;

  add = (path: string) => {
    this.emit("open", path);
    this.paths[path] = true;
  };

  // not used YET:
  close = (path: string) => {
    this.emit("close", path);
    delete this.paths[path];
  };
}

export const terminalTracker = new Terminals();

// this is used to know which path belongs to which terminal
// (this is the overall tab, not the individual frame -- it's
// used for the processes page)
export function pidToPath(pid: number): string | undefined {
  for (const terminal of Object.values(terminals)) {
    if (terminal.getPid() == pid) {
      return terminal.getPath();
    }
  }
}

// INPUT: primus and description of a terminal session (the path)
// OUTPUT: the name of a websocket channel that serves that terminal session.
export async function terminal(
  primus: PrimusWithChannels,
  path: string,
  options: Options,
): Promise<string> {
  const name = getChannelName(path);
  if (terminals[name] != null) {
    if (
      options.command != null &&
      options.command != terminals[name].getCommand()
    ) {
      logger.debug(
        "changing command/args for existing terminal and restarting",
        path,
      );
      terminals[name].setCommand(options.command, options.args);
    }
    return name;
  }

  logger.debug("creating terminal for ", { path });
  const terminal = new Terminal(primus, path, options);
  terminals[name] = terminal;
  await terminal.init();
  terminalTracker.add(path);

  return name;
}
