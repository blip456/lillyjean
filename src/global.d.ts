import type messages from "../messages/en.json";

import type { Locale } from "./i18n/config";

// Type-safe translation keys: en.json is the source locale, other locales come from Loco.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
