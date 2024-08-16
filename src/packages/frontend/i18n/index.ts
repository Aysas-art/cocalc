import {
  createIntl,
  createIntlCache,
  IntlShape,
  MessageFormatElement,
} from "react-intl";

import { AccountState } from "@cocalc/frontend/account/types";
import { redux } from "@cocalc/frontend/app-framework";
import localeEN from "@cocalc/frontend/i18n/en.json";
import {
  DEFAULT_LOCALE,
  Locale,
  LOCALIZATIONS,
} from "@cocalc/util/consts/locale";
import { unreachable } from "@cocalc/util/misc";

export { labels } from "./common";
export { DEFAULT_LOCALE, LOCALIZATIONS };
export type { Locale };

export const OTHER_SETTINGS_LOCALE_KEY = "i18n";

export type Messages =
  | Record<string, string>
  | Record<string, MessageFormatElement[]>;

export function sanitizeLocale(l: unknown): Locale {
  if (typeof l !== "string") return DEFAULT_LOCALE;
  return l in LOCALIZATIONS ? (l as Locale) : DEFAULT_LOCALE;
}

export function getLocale(
  other_settings: AccountState["other_settings"],
): Locale {
  const val = other_settings.get(OTHER_SETTINGS_LOCALE_KEY);
  return sanitizeLocale(val);
}

export function loadLocaleData(locale: Locale): Promise<Messages> {
  return (() => {
    switch (locale) {
      case "en":
        // We do not lazy load english, because it is the default. This language is "baked into" the app.
        return new Promise((done) => done(localeEN));
      case "de":
        return import("@cocalc/frontend/i18n/de_DE.json");
      case "zh":
        return import("@cocalc/frontend/i18n/zh_CN.json");
      case "es":
        return import("@cocalc/frontend/i18n/es_ES.json");
      default:
        unreachable(locale);
        throw new Error(`Unknown locale '${locale}.`);
    }
  })() as any as Promise<Messages>;
}

// This is optional but highly recommended, since it prevents memory leak
const cache = createIntlCache();

// Use this for example in an action, outside of React. e.g.
// const intl = await getIntl();
// intl.formatMessage(labels.account);
export async function getIntl(): Promise<IntlShape> {
  const val = redux
    .getStore("account")
    .getIn(["other_settings", OTHER_SETTINGS_LOCALE_KEY]);
  const locale = sanitizeLocale(val);
  const messages = await loadLocaleData(locale);
  return createIntl({ locale, messages }, cache);
}
