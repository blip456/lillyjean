import Link from "next/link";
import { useTranslations } from "next-intl";

import { APP_VERSION } from "@/lib/release/version";

/** Shows the semver version and links to the in-app changelog. */
export function VersionBadge() {
  const t = useTranslations("release");

  return (
    <Link
      href="/changelog"
      className="text-sm underline-offset-4 opacity-70 hover:underline"
    >
      {t("version", { version: APP_VERSION })} · {t("whatsNew")}
    </Link>
  );
}
