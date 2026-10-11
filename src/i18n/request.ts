import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from "./config";

// No locale in the URL: the app sits behind a login, so the language is a
// user preference (cookie now, profile setting later), not a route segment.
// The cookie is only read once there is a choice to make: reading it makes
// every page dynamic, which blocks prerendering and prefetching (T17).
export default getRequestConfig(async () => {
  const cookieLocale =
    locales.length > 1
      ? (await cookies()).get(LOCALE_COOKIE)?.value
      : undefined;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
