import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/books/book-cover";
import { BookRow } from "@/components/books/book-row";
import { getBookIndicators } from "@/components/challenges/integration/indicators.server";
import { OngoingChallenges } from "@/components/home/ongoing-challenges";
import { ReadlistsRow } from "@/components/home/readlists-row";
import { YearStats } from "@/components/home/year-stats";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { WhatsNewBanner } from "@/components/whats-new-banner";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { searchHref } from "@/lib/books/navigation";
import { countBooksRead, getMyBooks } from "@/lib/books/queries.server";
import { appToday } from "@/lib/challenges/dates";
import {
  countCompletedChallenges,
  getMyChallenges,
} from "@/lib/challenges/queries.server";
import { currentYear } from "@/lib/profile";
import { getMyReadlists } from "@/lib/readlists/queries.server";

/** Books shown under "Currently reading"; "All (n)" opens the full list. */
const HOME_READING_LIMIT = 3;

/** Readlists in the Home row; "All" opens the overview (C1). */
const HOME_READLISTS_LIMIT = 6;

/**
 * Home (B1, B2; P23): stats (with the challenges completed) → currently reading (with the
 * challenge indicator, P25) → ongoing challenges → readlists.
 */
export default async function HomePage() {
  // Everything loads in parallel with the account check; row level security keeps the queries
  // to the signed-in user, and the check redirects before anything is shown.
  const [
    { profile, pledge },
    t,
    read,
    reading,
    readlists,
    challenges,
    challengesCompleted,
  ] = await Promise.all([
    requireOnboardedAccount(),
    getTranslations("home"),
    countBooksRead(currentYear()),
    getMyBooks("reading"),
    getMyReadlists(HOME_READLISTS_LIMIT),
    getMyChallenges(),
    countCompletedChallenges(),
  ]);
  const shownReading = reading.slice(0, HOME_READING_LIMIT);
  // My challenges are loaded by now, so this adds no query.
  const indicators = await getBookIndicators(
    shownReading.map((book) => book.id),
  );

  return (
    <div className="space-y-6">
      <WhatsNewBanner />
      <header className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 font-serif text-3xl font-semibold">
          <span className="block font-sans text-sm font-normal text-muted">
            {t("welcome")}
          </span>
          <span className="block wrap-anywhere">{`@${profile.username}`}</span>
        </h1>
        <Link
          href="/profile"
          aria-label={t("openProfile")}
          className="shrink-0 rounded-full"
        >
          <Avatar username={profile.username} />
        </Link>
      </header>

      <YearStats
        read={read}
        goal={pledge}
        today={new Date()}
        challengesCompleted={challengesCompleted}
      />

      <section aria-labelledby="currently-reading" className="space-y-2">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <h2
            id="currently-reading"
            className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
          >
            {t("currentlyReading")}
          </h2>
          {reading.length > HOME_READING_LIMIT && (
            <Link
              href="/books/shelf/reading"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
            >
              {t("all", { count: reading.length })}
            </Link>
          )}
        </div>
        {reading.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-dashed text-center">
            <BookCover title="" coverUrl={null} size="sm" />
            <p className="font-semibold">{t("emptyTitle")}</p>
            <p className="text-sm text-muted">{t("emptyText")}</p>
            <ButtonLink
              href={searchHref("", "all", {
                kind: "status",
                status: "reading",
              })}
            >
              {t("addBook")}
            </ButtonLink>
          </Card>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {shownReading.map((book) => (
              <li key={book.id}>
                <BookRow book={book} challengeIndicator={indicators[book.id]} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <OngoingChallenges challenges={challenges.active} today={appToday()} />

      <ReadlistsRow readlists={readlists} />
    </div>
  );
}
