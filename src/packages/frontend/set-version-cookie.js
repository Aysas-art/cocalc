/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Set the not-secure cookie

[base-url]COCALC-VERSION

to the version of the client code.  This is used by the hub-proxy server on the
backend, to decide whether or not to allow the client to connect to projects.
Basically, we do not want to allow ancient buggy clients to connect in any
way at all.
*/

// https://github.com/reactivestack/cookies/tree/master/packages/universal-cookie#readme
import Cookies from "universal-cookie";
const cookies = new Cookies();

import { version } from "@cocalc/util/smc-version";
import { versionCookieName } from "@cocalc/util/consts";
import { appBasePath } from "@cocalc/frontend/customize/app-base-path";

// We don't really want this cookie to expire.  All it does is record the version of
// the code the client has loaded, and the version only goes up.  It does not provide
// any form of authentication.
const days = 300;
const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const https = location.protocol === "https:";
// sameSite+secure must come in tandem, but secure doesn't work if loaded via http
// sameSite needed if embedded in an iFrame
const secure = { secure: true, sameSite: "none" };
const opts = { expires: future, path: "/", ...(https ? secure : null) };
const NAME = versionCookieName(appBasePath);
cookies.set(NAME, version, opts);
