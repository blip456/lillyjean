import { getTranslations } from "next-intl/server";

import { LibraryCard } from "@/components/library-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { countBooksRead } from "@/lib/books/queries.server";
import { challengeHref, PAST_CHALLENGES_PATH } from "@/lib/challenges/links";
import { getMyChallenges } from "@/lib/challenges/queries.server";
import { currentYear } from "@/lib/profile";

/** Stamps on the profile; "Past challenges" lists them all (E3). */
const PROFILE_STAMPS_LIMIT = 8;

/**
 * G1 Profile: the library card with lifetime counts (books read, challenges completed), the
 * pledge and the challenges section: one stamp per completed challenge (→ E4), "Past
 * challenges" → E3.
 */
export default async function ProfilePage() {
  const [
    { profile, pledge },
    t,
    tChallenges,
    booksRead,
    booksReadThisYear,
    challenges,
  ] = await Promise.all([
    requireOnboardedAccount(),
    getTranslations("profile"),
    getTranslations("challenges"),
    countBooksRead(),
    countBooksRead(currentYear()),
    getMyChallenges(),
  ]);
  const completed = challenges.past;

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
          <span>{t("booksRead", { count: booksRead })}</span>
          <span>{t("challenges", { count: completed.length })}</span>
        </p>
      </LibraryCard>
      <Card className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{t("pledgeThisYear")}</h2>
        <p className="font-serif text-xl font-semibold">
          {pledge
            ? t("pledgeProgress", { count: booksReadThisYear, goal: pledge })
            : t("noPledge")}
        </p>
      </Card>
      <section aria-labelledby="profile-challenges" className="space-y-2">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <h2
            id="profile-challenges"
            className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
          >
            {t("challengesSection")}
          </h2>
          {completed.length > 0 && (
            <Link
              href={PAST_CHALLENGES_PATH}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
            >
              {t("pastChallenges")}
            </Link>
          )}
        </div>
        {completed.length === 0 ? (
          <Card className="border-dashed text-sm text-muted">
            {t("stampsEmpty")}
          </Card>
        ) : (
          <ul className="grid grid-cols-4 gap-3">
            {completed.slice(0, PROFILE_STAMPS_LIMIT).map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={challengeHref(challenge.id)}
                  aria-label={t("stampLabel", { title: challenge.title })}
                  title={challenge.title}
                  className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-foreground/60 bg-surface text-xs font-bold tracking-widest"
                >
                  <span aria-hidden="true" className="-rotate-12">
                    {tChallenges("doneStamp")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
