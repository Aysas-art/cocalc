// Websocket support

import LRU from "lru-cache";
import { createProxyServer } from "http-proxy";
import { versionCheckFails } from "./version";
import { getTarget } from "./target";
import getLogger from "../logger";
import { stripBasePath } from "./util";
import stripRememberMeCookie from "./strip-remember-me-cookie";
import { getEventListeners } from "node:events";

const logger = getLogger("proxy:handle-upgrade");

export default function init(
  { projectControl, isPersonal, httpServer, listenersHack },
  proxy_regexp: string,
) {
  const cache = new LRU({
    max: 5000,
    ttl: 1000 * 60 * 3,
  });

  const re = new RegExp(proxy_regexp);

  async function handleProxyUpgradeRequest(req, socket, head): Promise<void> {
    const dbg = (...args) => {
      logger.silly(req.url, ...args);
    };
    dbg("got upgrade request from url=", req.url);
    if (!req.url.match(re)) {
      throw Error(`url=${req.url} does not support upgrade`);
    }

    // Check that minimum version requirement is satisfied (this is in the header).
    // This is to have a way to stop buggy clients from causing trouble.  It's a purely
    // honor system sort of thing, but makes it possible for an admin to block clients
    // until they run newer code.  I used to have to use this a lot long ago...
    if (versionCheckFails(req)) {
      throw Error("client version check failed");
    }

    const url = stripBasePath(req.url);

    let remember_me, api_key;
    if (req.headers["cookie"] != null) {
      let cookie;
      ({ cookie, remember_me, api_key } = stripRememberMeCookie(
        req.headers["cookie"],
      ));
      req.headers["cookie"] = cookie;
    }

    dbg("calling getTarget");
    const { host, port, internal_url } = await getTarget({
      url,
      isPersonal,
      projectControl,
      remember_me,
      api_key,
    });
    dbg("got ", { host, port });

    const target = `ws://${host}:${port}`;
    if (internal_url != null) {
      req.url = internal_url;
    }
    if (cache.has(target)) {
      dbg("using cache");
      const proxy = cache.get(target);
      (proxy as any)?.ws(req, socket, head);
      return;
    }

    dbg("target", target);
    dbg("not using cache");
    const proxy = createProxyServer({
      ws: true,
      target,
      timeout: 3000,
    });
    cache.set(target, proxy);

    // taken from https://github.com/http-party/node-http-proxy/issues/1401
    proxy.on("proxyRes", function (proxyRes) {
      //console.log(
      //  "Raw [target] response",
      //  JSON.stringify(proxyRes.headers, true, 2)
      //);

      proxyRes.headers["x-reverse-proxy"] = "custom-proxy";
      proxyRes.headers["cache-control"] = "no-cache, no-store";

      //console.log(
      //  "Updated [proxied] response",
      //  JSON.stringify(proxyRes.headers, true, 2)
      //);
    });

    proxy.on("error", (err) => {
      logger.debug(`websocket proxy error, so clearing cache -- ${err}`);
      cache.delete(target);
    });
    proxy.on("close", () => {
      dbg("websocket proxy closed, so removing from cache");
      cache.delete(target);
    });
    proxy.ws(req, socket, head);
  }

  let handler;
  if (listenersHack) {
    // This is an insane horrible hack to fix https://github.com/sagemathinc/cocalc/issues/7067
    // The problem is that there are four separate websocket "upgrade" handlers when we are doing
    // development, and nodejs just doesn't hav a good solution to multiple websocket handlers,
    // as explained here: https://github.com/nodejs/node/issues/6339
    // The four upgrade handlers are:
    //   - this proxy here
    //   - the main hub primus one
    //   - the HMR reloader for that static webpack server for the app
    //   - the HMR reloader for nextjs
    // These all just sort of randomly fight for any incoming "upgrade" event,
    // and if they don't like it, tend to try to kill the socket.  It's totally insane.
    // What's worse is that getEventListeners only seems to ever return *two*
    // listeners.  By extensive trial and error, it seems to return first the primus
    // listener, then the nextjs one.  I have no idea why the order is that way; I would
    // expect the reverse.   And I don't know why this handler here isn't in the list.
    // In any case, once we get a failed request *and* we see there are at least two
    // other handlers (it's exactly two), we completely steal handling of the upgrade
    // event here.  We then call the appropriate other handler when needed.
    // I have no idea how the HMR reloader for that static webpack plays into this,
    // but it appears to just work for some reason.

    let listeners: any[] = [];
    handler = async (req, socket, head) => {
      logger.debug("Proxy websocket handling -- using listenersHack");
      try {
        await handleProxyUpgradeRequest(req, socket, head);
      } catch (err) {
        if (listeners.length == 0) {
          const x = getEventListeners(httpServer, "upgrade");
          if (x.length >= 2) {
            logger.debug(
              "Proxy websocket handling -- installing listenersHack",
            );
            listeners = [...x];
            httpServer.removeAllListeners("upgrade");
            httpServer.on("upgrade", handler);
          }
        }
        if (req.url.includes("hub?_primus") && listeners.length >= 2) {
          listeners[0](req, socket, head);
          return;
        }
        if (req.url.includes("_next/webpack-hmr") && listeners.length >= 2) {
          listeners[1](req, socket, head);
          return;
        }
        const msg = `WARNING: error upgrading websocket url=${req.url} -- ${err}`;
        logger.debug(msg);
        denyUpgrade(socket);
      }
    };
  } else {
    handler = async (req, socket, head) => {
      try {
        await handleProxyUpgradeRequest(req, socket, head);
      } catch (err) {
        const msg = `WARNING: error upgrading websocket url=${req.url} -- ${err}`;
        logger.debug(msg);
        denyUpgrade(socket);
      }
    };
  }

  return handler;
}

function denyUpgrade(socket) {
  socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
  socket.destroy();
}
