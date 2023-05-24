/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Application } from "express";
import getLogger from "../logger";
import initProxy from "./handle-request";
import initUpgrade from "./handle-upgrade";
import base_path from "@cocalc/backend/base-path";
import { ProjectControlFunction } from "@cocalc/server/projects/control";

const logger = getLogger("proxy");

interface Options {
  app: Application;
  httpServer; // got from express_app via httpServer = http.createServer(app).
  projectControl: ProjectControlFunction; // controls projects (aka "compute server")
  isPersonal: boolean; // if true, disables all access controls
}

export default function init(opts: Options) {
  const proxy_regexp = `^${
    base_path.length <= 1 ? "" : base_path
  }\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\/*`;
  logger.info("creating proxy server with proxy_regexp", proxy_regexp);
  const handleProxy = initProxy(opts);
  const handleUpgrade = initUpgrade(opts, proxy_regexp);

  opts.app.all(proxy_regexp, handleProxy);

  opts.httpServer.on("upgrade", handleUpgrade);
}
