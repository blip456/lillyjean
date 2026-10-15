import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/books/book-cover";
import { BookRow } from "@/components/books/book-row";
import { ReadlistsRow } from "@/components/home/readlists-row";
import { YearStats } from "@/components/home/year-stats";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { WhatsNewBanner } from "@/components/whats-new-banner";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { searchHref } from "@/lib/books/navigation";
import { countBooksRead, getMyBooks } from "@/lib/books/queries.server";
import { getMyReadlists } from "@/lib/readlists/queries.server";

/** Books shown under "Currently reading"; "All (n)" opens the full list. */
const HOME_READING_LIMIT = 3;

/** Readlists in the Home row; "All" opens the overview (C1). */
const HOME_READLISTS_LIMIT = 6;

/**
 * Home (B1, B2; P23): stats → currently reading → (ongoing challenges, S5) → readlists. Ongoing
 * challenges are added when Sprint 5 ships.
 */
export default async function HomePage() {
  const { profile, pledge, year } = await requireOnboardedAccount();
  const t = await getTranslations("home");
  const [read, reading, readlists] = await Promise.all([
    countBooksRead(year),
    getMyBooks("reading"),
    getMyReadlists(HOME_READLISTS_LIMIT),
  ]);

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

      <YearStats read={read} goal={pledge} today={new Date()} />

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
            {reading.slice(0, HOME_READING_LIMIT).map((book) => (
              <li key={book.id}>
                <BookRow book={book} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReadlistsRow readlists={readlists} />
    </div>
  );
}
