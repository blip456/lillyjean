import Link from "next/link";
import { useTranslations } from "next-intl";

import { APP_VERSION } from "@/lib/release/version";

/** Shows the semver version and links to the in-app changelog. */
export function VersionBadge() {
  const t = useTranslations("release");

  return (
    <Link
      href="/changelog"
      className="inline-flex min-h-tap items-center text-subtitle text-link underline-offset-4 hover:underline"
    >
      {t("version", { version: APP_VERSION })} · {t("whatsNew")}
    </Link>
  );
}
