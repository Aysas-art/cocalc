/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
This makes dedicated disks conveniently available from the $HOME directory – a kucalc-only functionality.
*/

import { ROOT, HOME_PREFIX } from "@cocalc/util/consts/dedicated";
import { constants as fs_constants, promises as fs } from "fs";
import { isArray } from "lodash";
import { homedir } from "os";
import { join } from "path";
import { getLogger } from "./logger";
import { getProjectConfig } from "./project-setup";

const { F_OK, W_OK, R_OK } = fs_constants;

const { info, warn } = getLogger("dedicated-disks");

async function ensureSymlink(name: string): Promise<boolean> {
  const disk = join(ROOT, name);
  const link = join(homedir(), HOME_PREFIX);
  try {
    await fs.access(disk, F_OK | R_OK | W_OK);
  } catch {
    warn(`disk directory ${disk} not writeable -- abort`);
    return false;
  }
  // create a symlink to the /local directory
  // don't disturb what's already in $HOME
  try {
    await fs.access(link, F_OK);
    info(`'${link}' already exists`);
  } catch {
    // link does not exist, hence we create it
    try {
      await fs.symlink(ROOT, link);
      info(`successfully symlinked ${link} → ${disk}`);
    } catch (err) {
      warn(`problem symlinking ${link} → ${disk} -- ${err}`);
    }
  }
  // even if there is a problem, it makes no sense to try again
  return true;
}

export async function init() {
  info("initializing");
  const conf = getProjectConfig();
  // we're a bit extra careful, because there could be anything in the DB
  if (conf?.quota?.dedicated_disks == null) return;
  if (!isArray(conf.quota.dedicated_disks)) return;
  for (const disk of conf.quota.dedicated_disks) {
    if (typeof disk.name === "string") {
      // if there is a disk, a symlink is made to point to the directory where it is
      // hence it is enough to link to it once
      if (await ensureSymlink(disk.name)) {
        return;
      }
    }
  }
}
