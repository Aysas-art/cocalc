import type {
  ClientCommand,
  IPty,
  PrimusChannel,
  PrimusWithChannels,
  Options,
} from "./types";
import { getChannelName, getRemotePtyChannelName } from "./util";
import { console_init_filename, len, path_split } from "@cocalc/util/misc";
import { getLogger } from "@cocalc/backend/logger";
import { envForSpawn } from "@cocalc/backend/misc";
import { getCWD } from "./util";
import { readlink, realpath, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node-pty";
import { throttle } from "lodash";
import { delay } from "awaiting";
import { exists } from "@cocalc/backend/misc/async-utils-node";
import { isEqual } from "lodash";
import type { Spark } from "primus";

const logger = getLogger("terminal:terminal");

const CHECK_INTERVAL_MS = 5 * 1000;
const MAX_HISTORY_LENGTH = 10 * 1000 * 1000;
const TRUNCATE_THRESH_MS = 10 * 1000;
const FREQUENT_RESTART_DELAY_MS = 1 * 1000;
const FREQUENT_RESTART_INTERVAL_MS = 10 * 1000;
const INFINITY = 999999;
const DEFAULT_COMMAND = "/bin/bash";

type MessagesState = "none" | "reading";
type State = "init" | "ready" | "closed";

export class Terminal {
  private state: State = "init";
  private options: Options;
  private channel: PrimusChannel;
  private remotePtyChannel: PrimusChannel;
  private history: string = "";
  private path: string;
  private client_sizes = {};
  private last_truncate_time: number = Date.now();
  private truncating: number = 0;
  private last_exit: number = 0;
  private size?: { rows: number; cols: number };
  private backendMessagesBuffer = "";
  private backendMessagesState: MessagesState = "none";
  // two different ways of providing the backend support -- local or remote
  private localPty?: IPty;
  private remotePty?: Spark;

  constructor(primus: PrimusWithChannels, path: string, options: Options = {}) {
    this.options = { command: DEFAULT_COMMAND, ...options };
    this.path = path;
    this.channel = primus.channel(getChannelName(path));
    this.channel.on("connection", this.handleClientConnection);
    this.remotePtyChannel = primus.channel(getRemotePtyChannelName(path));
    this.remotePtyChannel.on("connection", this.handleRemotePtyConnection);
  }

  init = async () => {
    await this.initLocalPty();
  };

  private initLocalPty = async () => {
    if (this.state == "closed") return;
    if (this.remotePty != null) {
      // don't init local pty if there is a remote one.
      return;
    }

    const args: string[] = [];

    const { options } = this;
    if (options.args != null) {
      for (const arg of options.args) {
        if (typeof arg === "string") {
          args.push(arg);
        } else {
          logger.debug("WARNING -- discarding invalid non-string arg ", arg);
        }
      }
    } else {
      const initFilename: string = console_init_filename(this.path);
      if (await exists(initFilename)) {
        args.push("--init-file");
        args.push(path_split(initFilename).tail);
      }
    }

    const { head: pathHead, tail: pathTail } = path_split(this.path);
    const env = {
      COCALC_TERMINAL_FILENAME: pathTail,
      ...envForSpawn(),
      ...options.env,
    };
    if (env["TMUX"]) {
      // If TMUX was set for some reason in the environment that setup
      // a cocalc project (e.g., start hub in dev mode from tmux), then
      // TMUX is set even though terminal hasn't started tmux yet, which
      // confuses our open command.  So we explicitly unset it here.
      // https://unix.stackexchange.com/questions/10689/how-can-i-tell-if-im-in-a-tmux-session-from-a-bash-script
      delete env["TMUX"];
    }

    const { command } = options;
    if (command == null) {
      throw Error("bug");
    }
    const cwd = getCWD(pathHead, options.cwd);

    try {
      this.history = (await readFile(this.path)).toString();
    } catch (err) {
      logger.debug("WARNING: failed to load", this.path, err);
    }
    const localPty = spawn(command, args, { cwd, env }) as IPty;
    logger.debug("pid=", localPty.pid, { command, args });
    this.localPty = localPty;

    localPty.on("data", this.handleDataFromTerminal);

    // Whenever localPty ends, we just respawn it, but potentially
    // with a pause to avoid weird crash loops bringing down the project.
    localPty.on("exit", async () => {
      if (this.state == "closed") return;
      if (this.remotePty != null) {
        // do not create a new localPty since we're switching to a remotePty.
        return;
      }
      logger.debug("EXIT -- spawning again");
      const now = Date.now();
      if (now - this.last_exit <= FREQUENT_RESTART_INTERVAL_MS) {
        // frequent exit; we wait a few seconds, since otherwise channel
        // restarting could burn all cpu and break everything.
        logger.debug("EXIT -- waiting a few seconds...");
        await delay(FREQUENT_RESTART_DELAY_MS);
      }
      this.last_exit = now;
      logger.debug("spawning local pty...");
      await this.initLocalPty();
      logger.debug("finished spawn");
    });

    this.state = "ready";

    // set the size
    this.resize();
  };

  close = () => {
    logger.debug("close");
    if ((this.state as State) == "closed") {
      return;
    }
    this.state = "closed";
    if (this.localPty != null) {
      this.killPty();
    }
    this.channel.destroy();
    this.remotePtyChannel.destroy();
  };

  getPid = (): number | undefined => {
    return this.localPty?.pid;
  };

  // original path
  getPath = () => {
    return this.options.path;
  };

  getCommand = () => {
    return this.options.command;
  };

  setCommand = (command: string, args?: string[]) => {
    if (this.state == "closed") return;
    if (command == this.options.command && isEqual(args, this.options.args)) {
      logger.debug("setCommand: no actual change.");
      return;
    }
    logger.debug(
      "setCommand",
      { command: this.options.command, args: this.options.args },
      "-->",
      { command, args },
    );
    // we track change
    this.options.command = command;
    this.options.args = args;
    if (this.remotePty != null) {
      // remote pty
      this.remotePty.write({ cmd: "set_command", command, args });
    } else if (this.localPty != null) {
      this.killLocalPty();
    }
  };

  private killPty = () => {
    if (this.localPty != null) {
      this.killLocalPty();
    } else if (this.remotePty != null) {
      this.killRemotePty();
    }
  };

  private killLocalPty = () => {
    if (this.localPty == null) return;
    logger.debug("killing ", this.localPty.pid);
    this.localPty.kill("SIGKILL");
    this.localPty.destroy();
    delete this.localPty;
  };

  private killRemotePty = () => {
    if (this.remotePty == null) return;
    this.remotePty.write({ cmd: "kill" });
  };

  private setSizePty = (rows: number, cols: number) => {
    if (this.localPty != null) {
      this.localPty.resize(cols, rows);
    } else if (this.remotePty != null) {
      this.remotePty.write({ cmd: "size", rows, cols });
    }
  };

  private saveHistoryToDisk = throttle(async () => {
    try {
      await writeFile(this.path, this.history);
    } catch (err) {
      logger.debug("WARNING: failed to save terminal history to disk", err);
    }
  }, 15000);

  private resetBackendMessagesBuffer = () => {
    this.backendMessagesBuffer = "";
    this.backendMessagesState = "none";
  };

  private handleDataFromTerminal = (data) => {
    //console.log("handleDataFromTerminal", { data });
    if (this.state == "closed") return;
    //logger.debug("terminal: term --> browsers", data);
    this.handleBackendMessages(data);
    this.history += data;
    this.saveHistoryToDisk();
    const n = this.history.length;
    if (n >= MAX_HISTORY_LENGTH) {
      logger.debug("terminal data -- truncating");
      this.history = this.history.slice(n - MAX_HISTORY_LENGTH / 2);
      const last = this.last_truncate_time;
      const now = new Date().valueOf();
      this.last_truncate_time = now;
      logger.debug(now, last, now - last, TRUNCATE_THRESH_MS);
      if (now - last <= TRUNCATE_THRESH_MS) {
        // getting a huge amount of data quickly.
        if (!this.truncating) {
          this.channel.write({ cmd: "burst" });
        }
        this.truncating += data.length;
        setTimeout(this.checkIfStillTruncating, CHECK_INTERVAL_MS);
        if (this.truncating >= 5 * MAX_HISTORY_LENGTH) {
          // only start sending control+c if output has been completely stuck
          // being truncated several times in a row -- it has to be a serious non-stop burst...
          this.localPty?.write("\u0003");
        }
        return;
      } else {
        this.truncating = 0;
      }
    }
    if (!this.truncating) {
      this.channel.write(data);
    }
  };

  private checkIfStillTruncating = () => {
    if (!this.truncating) {
      return;
    }
    if (Date.now() - this.last_truncate_time >= CHECK_INTERVAL_MS) {
      // turn off truncating, and send recent data.
      const { truncating, history } = this;
      this.channel.write(
        history.slice(Math.max(0, history.length - truncating)),
      );
      this.truncating = 0;
      this.channel.write({ cmd: "no-burst" });
    } else {
      setTimeout(this.checkIfStillTruncating, CHECK_INTERVAL_MS);
    }
  };

  private handleBackendMessages = (data: string) => {
    /* parse out messages like this:
            \x1b]49;"valid JSON string here"\x07
         and format and send them via our json channel.
         NOTE: such messages also get sent via the
         normal channel, but ignored by the client.
      */
    if (this.backendMessagesState === "none") {
      const i = data.indexOf("\x1b");
      if (i === -1) {
        return; // nothing to worry about
      }
      // stringify it so it is easy to see what is there:
      this.backendMessagesState = "reading";
      this.backendMessagesBuffer = data.slice(i);
    } else {
      this.backendMessagesBuffer += data;
    }
    if (
      this.backendMessagesBuffer.length >= 5 &&
      this.backendMessagesBuffer.slice(1, 5) != "]49;"
    ) {
      this.resetBackendMessagesBuffer();
      return;
    }
    if (this.backendMessagesBuffer.length >= 6) {
      const i = this.backendMessagesBuffer.indexOf("\x07");
      if (i === -1) {
        // continue to wait... unless too long
        if (this.backendMessagesBuffer.length > 10000) {
          this.resetBackendMessagesBuffer();
        }
        return;
      }
      const s = this.backendMessagesBuffer.slice(5, i);
      this.resetBackendMessagesBuffer();
      logger.debug(
        `handle_backend_message: parsing JSON payload ${JSON.stringify(s)}`,
      );
      try {
        const payload = JSON.parse(s);
        this.channel.write({ cmd: "message", payload });
      } catch (err) {
        logger.warn(
          `handle_backend_message: error sending JSON payload ${JSON.stringify(
            s,
          )}, ${err}`,
        );
        // Otherwise, ignore...
      }
    }
  };

  private setSize = (spark: Spark, newSize: { rows; cols }) => {
    this.client_sizes[spark.id] = newSize;
    try {
      this.resize();
    } catch (err) {
      // no-op -- can happen if terminal is restarting.
      logger.debug("WARNING: resizing terminal", this.path, err);
    }
  };

  getSize = (): { rows: number; cols: number } | undefined => {
    const sizes = this.client_sizes;
    if (len(sizes) == 0) {
      return;
    }
    let rows: number = INFINITY;
    let cols: number = INFINITY;
    for (const id in sizes) {
      if (sizes[id].rows) {
        // if, since 0 rows or 0 columns means *ignore*.
        rows = Math.min(rows, sizes[id].rows);
      }
      if (sizes[id].cols) {
        cols = Math.min(cols, sizes[id].cols);
      }
    }
    if (rows === INFINITY || cols === INFINITY) {
      // no clients with known sizes currently visible
      return;
    }
    // ensure valid values
    rows = Math.max(rows ?? 1, rows);
    cols = Math.max(cols ?? 1, cols);
    return { rows, cols };
  };

  private resize = () => {
    if (this.state == "closed") return;
    //logger.debug("resize");
    if (this.localPty == null && this.remotePty == null) {
      // nothing to do
      return;
    }
    const size = this.getSize();
    if (size == null) {
      return;
    }
    const { rows, cols } = size;
    logger.debug("resize", "new size", rows, cols);
    try {
      this.setSizePty(rows, cols);
      // broadcast out new size to all clients
      this.channel.write({ cmd: "size", rows, cols });
    } catch (err) {
      logger.debug("terminal channel -- WARNING: unable to resize term", err);
    }
  };

  private sendCurrentWorkingDirectory = async (spark: Spark) => {
    if (this.localPty != null) {
      this.sendCurrentWorkingDirectoryLocalPty(spark);
    } else if (this.remotePty != null) {
      this.sendCurrentWorkingDirectoryRemotePty(spark);
    }
  };

  private sendCurrentWorkingDirectoryLocalPty = async (spark: Spark) => {
    if (this.localPty == null) {
      return;
    }
    // we reply with the current working directory of the underlying terminal process,
    // which is why we use readlink and proc below.
    const pid = this.localPty.pid;
    // [hsy/dev] wrapping in realpath, because I had the odd case, where the project's
    // home included a symlink, hence the "startsWith" below didn't remove the home dir.
    const home = await realpath(process.env.HOME ?? "/home/user");
    const cwd = await readlink(`/proc/${pid}/cwd`);
    // try to send back a relative path, because the webapp does not
    // understand absolute paths
    const path = cwd.startsWith(home) ? cwd.slice(home.length + 1) : cwd;
    logger.debug("terminal cwd sent back", { path });
    spark.write({ cmd: "cwd", payload: path });
  };

  private sendCurrentWorkingDirectoryRemotePty = async (spark: Spark) => {
    if (this.remotePty == null) {
      return;
    }
    // Write cwd command, then wait for a cmd:'cwd' response, and
    // forward it to the spark.
    this.remotePty.write({ cmd: "cwd" });
    const handle = (mesg) => {
      if (typeof mesg == "object" && mesg.cmd == "cwd") {
        spark.write(mesg);
        this.remotePty?.removeListener("data", handle);
      }
    };
    this.remotePty.addListener("data", handle);
  };

  private bootAllOtherClients = (spark: Spark) => {
    // delete all sizes except this one, so at least kick resets
    // the sizes no matter what.
    for (const id in this.client_sizes) {
      if (id !== spark.id) {
        delete this.client_sizes[id];
      }
    }
    // next tell this client to go fullsize.
    if (this.size != null) {
      const { rows, cols } = this.size;
      if (rows && cols) {
        spark.write({ cmd: "size", rows, cols });
      }
    }
    // broadcast message to all other clients telling them to close.
    this.channel.forEach((spark0, id, _) => {
      if (id !== spark.id) {
        spark0.write({ cmd: "close" });
      }
    });
  };

  private writeToPty = (data) => {
    if (this.localPty != null) {
      this.localPty.write(data);
    } else if (this.remotePty != null) {
      this.remotePty.write(data);
    }
  };

  private handleDataFromClient = async (
    spark,
    data: string | ClientCommand,
  ) => {
    //logger.debug("terminal: browser --> term", name, JSON.stringify(data));
    if (typeof data === "string") {
      this.writeToPty(data);
    } else if (typeof data === "object") {
      await this.handleCommandFromClient(spark, data);
    }
  };

  private handleCommandFromClient = async (
    spark: Spark,
    data: ClientCommand,
  ) => {
    // control message
    //logger.debug("terminal channel control message", JSON.stringify(data));
    switch (data.cmd) {
      case "size":
        this.setSize(spark, { rows: data.rows, cols: data.cols });
        break;

      case "set_command":
        this.setCommand(data.command, data.args);
        break;

      case "kill":
        // send kill signal
        this.killPty();
        break;

      case "cwd":
        await this.sendCurrentWorkingDirectory(spark);
        break;

      case "boot": {
        this.bootAllOtherClients(spark);
        break;
      }
    }
  };

  private handleClientConnection = (spark: Spark) => {
    logger.debug(
      this.path,
      `new client connection from ${spark.address.ip} -- ${spark.id}`,
    );

    // send current size info
    if (this.size != null) {
      const { rows, cols } = this.size;
      spark.write({ cmd: "size", rows, cols });
    }

    // send burst info
    if (this.truncating) {
      spark.write({ cmd: "burst" });
    }

    // send history
    spark.write(this.history);

    // have history, so do not ignore commands now.
    spark.write({ cmd: "no-ignore" });

    spark.on("end", () => {
      if (this.state == "closed") return;
      delete this.client_sizes[spark.id];
      this.resize();
    });

    spark.on("data", async (data) => {
      if ((this.state as State) == "closed") return;
      try {
        await this.handleDataFromClient(spark, data);
      } catch (err) {
        if (this.state != "closed") {
          spark.write(`${err}`);
        }
      }
    });
  };

  // inform remote pty client of the exact options that are current here.
  private initRemotePty = () => {
    if (this.remotePty == null) return;
    this.remotePty.write({
      cmd: "init",
      options: this.options,
      size: this.getSize(),
    });
  };

  private handleRemotePtyConnection = (remotePty: Spark) => {
    logger.debug(
      this.path,
      `new pty connection from ${remotePty.address.ip} -- ${remotePty.id}`,
    );

    remotePty.on("end", async () => {
      if (this.state == "closed") return;
      delete this.remotePty;
      await this.initLocalPty();
    });

    remotePty.on("data", async (data) => {
      if ((this.state as State) == "closed") return;
      if (typeof data == "string") {
        this.handleDataFromTerminal(data);
      } else {
        switch (data.cmd) {
          case "exit": {
            // the pty exited.
            if (this.localPty != null) {
              // do not create a new remotePty since we're switching back to local one
              return;
            }
            const now = Date.now();
            if (now - this.last_exit <= FREQUENT_RESTART_INTERVAL_MS) {
              logger.debug("EXIT -- waiting a few seconds...");
              await delay(FREQUENT_RESTART_DELAY_MS);
            }
            this.last_exit = now;
            logger.debug("spawning remote pty...");
            this.initRemotePty();
            logger.debug("finished spawn");
            break;
          }
        }
      }
    });

    this.remotePty = remotePty;
    this.initRemotePty();
    this.killLocalPty();
  };
}
