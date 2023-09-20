/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Server directory listing through the HTTP server and Websocket API.

{files:[..., {size:?,name:?,mtime:?,isdir:?}]}

where mtime is integer SECONDS since epoch, size is in bytes, and isdir
is only there if true.

Obviously we should probably use POST instead of GET, due to the
result being a function of time... but POST is so complicated.
Use ?random= or ?time= if you're worried about cacheing.
Browser client code only uses this through the websocket anyways.
*/

import { reuseInFlight } from "async-await-utils/hof";
import { Router } from "express";
import type { Dirent, Stats } from "node:fs";
import { lstat, readdir, readlink, stat } from "node:fs/promises";

import { getLogger } from "@cocalc/project/logger";
import { DirectoryListingEntry } from "@cocalc/util/types";
const winston = getLogger("directory-listing");

// SMC_LOCAL_HUB_HOME is used for developing cocalc inside cocalc...
const HOME = process.env.SMC_LOCAL_HUB_HOME ?? process.env.HOME;

export const get_listing = reuseInFlight(getDirectoryListing);

async function getDirectoryListing(
  path: string, // assumed in home directory!
  hidden: boolean = false
): Promise<DirectoryListingEntry[]> {
  const dir = HOME + "/" + path;
  winston.debug(dir);
  const files: DirectoryListingEntry[] = [];
  let file: Dirent;
  for (file of await readdir(dir, { withFileTypes: true })) {
    if (!hidden && file.name[0] === ".") {
      continue;
    }
    let entry: DirectoryListingEntry;
    try {
      // I don't actually know if file.name can fail to be JSON-able with node.js -- is there
      // even a string in Node.js that cannot be dumped to JSON?  With python
      // this definitely was a problem, but I can't find the examples now.  Users
      // sometimes create "insane" file names via bugs in C programs...
      JSON.stringify(file.name);
      entry = { name: file.name };
    } catch (err) {
      entry = { name: "????", error: "Cannot display bad binary filename. " };
    }

    try {
      let stats: Stats;
      if (file.isSymbolicLink()) {
        // Optimization: don't explicitly set issymlink if it is false
        entry.issymlink = true;
      }
      if (entry.issymlink) {
        // at least right now we only use this symlink stuff to display
        // information to the user in a listing, and nothing else.
        try {
          entry.link_target = await readlink(dir + "/" + entry.name);
        } catch (err) {
          // If we don't know the link target for some reason; just ignore this.
        }
      }
      try {
        stats = await stat(dir + "/" + entry.name);
      } catch (err) {
        // don't have access to target of link (or it is a broken link).
        stats = await lstat(dir + "/" + entry.name);
      }
      entry.mtime = stats.mtime.valueOf() / 1000;
      if (stats.isDirectory()) {
        entry.isdir = true;
        const v = await readdir(dir + "/" + entry.name);
        if (hidden) {
          entry.size = v.length;
        } else {
          // only count non-hidden files
          entry.size = 0;
          for (const x of v) {
            if (x[0] != ".") {
              entry.size += 1;
            }
          }
        }
      } else {
        entry.size = stats.size;
      }
    } catch (err) {
      entry.error = `${entry.error ? entry.error : ""}${err}`;
    }
    files.push(entry);
  }
  return files;
}

export default function init(): Router {
  const base = "/.smc/directory_listing/";
  const router = Router();

  router.get(base + "*", async (req, res) => {
    // decodeURIComponent because decodeURI(misc.encode_path('asdf/te #1/')) != 'asdf/te #1/'
    // https://github.com/sagemathinc/cocalc/issues/2400
    const path = decodeURIComponent(req.path.slice(base.length).trim());
    const { hidden } = req.query;
    // Fast -- do directly in this process.
    try {
      const files = await get_listing(path, !!hidden);
      res.json({ files });
    } catch (err) {
      res.json({ error: `${err}` });
    }
  });

  return router;
}
