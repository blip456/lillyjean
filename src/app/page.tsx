import { useTranslations } from "next-intl";

import { VersionBadge } from "@/components/version-badge";

// Temporary start page. Replaced by the splash/welcome flow once the wireframes are approved.
export default function Home() {
  const t = useTranslations("app");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">{t("name")}</h1>
      <p className="max-w-md opacity-80">{t("tagline")}</p>
      <VersionBadge />
    </main>
  );
}
