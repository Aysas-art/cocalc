/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

/*
Page for a given user.
*/

/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: MS-RSL – see LICENSE.md for details
 */

import { join } from "path";
import basePath from "lib/base-path";
import getAccountInfo from "lib/share/get-account-info";
import withCustomize from "lib/with-customize";
import Account from "components/account/account";

export default Account;

export async function getServerSideProps(context) {
  const { account_id } = context.params;
  try {
    const accountInfo = await getAccountInfo(account_id, context.req);
    if (accountInfo.name) {
      // This account has a nice username. Redirect to that instead
      // of rendering here.
      return { props: { redirect: join(basePath, accountInfo.name) } };
    }
    return await withCustomize({
      context,
      props: accountInfo,
    });
  } catch (_err) {
    // console.log(err);
    return { notFound: true };
  }
}
