import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { WhatsNewBanner } from "@/components/whats-new-banner";
import { requireOnboardedAccount } from "@/lib/account/guards";

/** Home (B1/B2). Sprint 2 shows the pledge; books, challenges and readlists follow in S3–S5. */
export default async function HomePage() {
  const { profile, pledge } = await requireOnboardedAccount();
  const t = await getTranslations("home");
  const booksRead = 0;

  return (
    <div className="space-y-6">
      <WhatsNewBanner />
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">
          {t("greeting", { username: `@${profile.username}` })}
        </h1>
        <Link
          href="/profile"
          aria-label={t("openProfile")}
          className="rounded-full"
        >
          <Avatar username={profile.username} />
        </Link>
      </header>
      <Card className="space-y-2">
        <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          {t("thisYear")}
        </h2>
        <p className="font-serif text-2xl font-semibold">
          {pledge
            ? t("booksRead", { count: booksRead, goal: pledge })
            : t("booksReadNoGoal", { count: booksRead })}
        </p>
        {!pledge && (
          <Link
            href="/settings/pledge"
            className="text-sm font-semibold underline underline-offset-4"
          >
            {t("pledgeLink")}
          </Link>
        )}
      </Card>
      <Card className="border-dashed text-muted">{t("comingNext")}</Card>
    </div>
  );
}
