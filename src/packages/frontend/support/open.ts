// Opens support page in a new browser tab
// with url query param set to the current location.
import { open_new_tab as openNewTab } from "@cocalc/frontend/misc/open-browser-tab";
import getURL, { Options } from "./url";

export default function openSupportTab(options: Options = {}) {
  // Note that this is a 2K limit on URL lengths, so the body had better not be too large.
  openNewTab(getURL(options));
}
