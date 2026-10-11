import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("comingSoon");
  return { title: t("challenges.title") };
}

/** Challenges tab until Sprint 5 ships it. */
export default function ChallengesPage() {
  return <ComingSoon feature="challenges" />;
}
