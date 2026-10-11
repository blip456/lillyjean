import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("comingSoon");
  return { title: t("readlists.title") };
}

/** Readlists tab until Sprint 4 ships it. */
export default function ReadlistsPage() {
  return <ComingSoon feature="readlists" />;
}
