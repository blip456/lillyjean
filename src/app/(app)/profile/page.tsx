import { getTranslations } from "next-intl/server";

import { LibraryCard } from "@/components/library-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function ProfilePage() {
  const { profile, pledge } = await requireOnboardedAccount();
  const t = await getTranslations("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        backHref="/"
        aside={
          <Link
            href="/settings"
            className="text-sm font-semibold underline underline-offset-4"
          >
            {t("openSettings")}
          </Link>
        }
      />
      <LibraryCard
        username={profile.username}
        memberSince={new Date(profile.created_at)}
      >
        <p className="flex gap-4 text-sm">
          <span>{t("booksRead", { count: 0 })}</span>
          <span>{t("challenges", { count: 0 })}</span>
        </p>
      </LibraryCard>
      <Card className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{t("pledgeThisYear")}</h2>
        <p className="font-serif text-xl font-semibold">
          {pledge
            ? t("pledgeProgress", { count: 0, goal: pledge })
            : t("noPledge")}
        </p>
      </Card>
    </div>
  );
}
