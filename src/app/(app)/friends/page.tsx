import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("comingSoon");
  return { title: t("friends.title") };
}

/** Friends tab until Sprint 7 ships it. */
export default function FriendsPage() {
  return <ComingSoon feature="friends" />;
}
