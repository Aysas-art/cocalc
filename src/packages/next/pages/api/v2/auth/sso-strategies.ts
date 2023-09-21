/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/* api call to get the supported SSO strategies, and additional metadata (e.g.,
icons) that make them easier to work with.

Returns array Strategy[], where Strategy is as defined in

       @cocalc/database/settings/get-sso-strategies

or {error:message} if something goes wrong.
*/

import getStrategies from "@cocalc/database/settings/get-sso-strategies";

export default async function handle(_req, res) {
  try {
    res.json(await getStrategies());
  } catch (err) {
    res.json({ error: err.message });
  }
}
