/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { DOMAIN_URL } from "@cocalc/util/theme";
import { appBasePath } from "@cocalc/frontend/customize/app-base-path";

// this BASE_URL really is the base *url* -- it starts with http,
// and does NOT end with /
export let BASE_URL: string;

try {
  // note that window.location.origin includes the port, so critical to use that!
  BASE_URL = window.location.origin;
  if (appBasePath.length > 1) {
    BASE_URL += appBasePath;
  }
} catch (_err) {
  // backend server
  BASE_URL = DOMAIN_URL;
}
