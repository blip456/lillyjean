import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { PlusIcon } from "@/components/navigation/icons";
import { DeletedNotice } from "@/components/readlists/deleted-notice";
import {
  NewReadlistTile,
  ReadlistTile,
} from "@/components/readlists/readlist-tile";
import { ReadlistMosaic } from "@/components/readlists/readlist-mosaic";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { countMyShelves } from "@/lib/books/shelf-counts.server";
import { shelfHref } from "@/lib/books/shelves";
import { BOOK_STATUSES } from "@/lib/books/types";
import { DELETED_PARAM, newReadlistHref } from "@/lib/readlists/links";
import { getMyReadlists } from "@/lib/readlists/queries.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("readlists");
  return { title: t("title") };
}

const sectionTitle =
  "text-xs font-semibold tracking-[0.2em] text-muted uppercase";

/**
 * C1 Readlists overview: your three statuses as system lists (each opens its shelf, B4) and your
 * readlists as tiles with the automatic cover mosaic (P19), most recently changed first. No
 * filter bar until sharing ships (P42). `?deleted=1` (after deleting a readlist) shows
 * "Readlist deleted".
 */
export default async function ReadlistsPage({
  searchParams,
}: PageProps<"/readlists">) {
  const [{ profile }, { [DELETED_PARAM]: deleted }, t, counts, readlists] =
    await Promise.all([
      requireOnboardedAccount(),
      searchParams,
      getTranslations(),
      countMyShelves(),
      getMyReadlists(),
    ]);
  const justDeleted = deleted === "1";

  return (
    <div className="space-y-6">
      {justDeleted && <DeletedNotice />}
      <header className="flex min-h-11 items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">
          {t("readlists.title")}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={newReadlistHref()}
            aria-label={t("readlists.newReadlist")}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <PlusIcon />
          </Link>
          <Link
            href="/profile"
            aria-label={t("readlists.openProfile")}
            className="rounded-full"
          >
            <Avatar username={profile.username} />
          </Link>
        </div>
      </header>

      <section aria-labelledby="your-books" className="space-y-2">
        <h2 id="your-books" className={sectionTitle}>
          {t("readlists.yourBooks")}
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {BOOK_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={shelfHref(status)}
                className="flex min-h-18 flex-col items-center justify-center rounded-2xl border border-border bg-surface px-2 py-3 text-center hover:bg-border/30"
              >
                <span className="text-xl font-semibold tabular-nums">
                  {counts[status]}
                </span>
                <span className="text-sm leading-tight">
                  {t(`books.status.${status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="your-readlists" className="space-y-3">
        <h2 id="your-readlists" className={sectionTitle}>
          {t("readlists.yourReadlists")}
        </h2>
        {readlists.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-dashed text-center">
            <ReadlistMosaic covers={[]} size="row" />
            <p className="font-semibold">{t("readlists.emptyTitle")}</p>
            <p className="text-sm text-muted">{t("readlists.emptyText")}</p>
            <ButtonLink href={newReadlistHref()}>
              {t("readlists.newReadlist")}
            </ButtonLink>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-5">
            {readlists.map((readlist) => (
              <li key={readlist.id}>
                <ReadlistTile readlist={readlist} size="tile" />
              </li>
            ))}
            <li>
              <NewReadlistTile size="tile" label={t("readlists.newReadlist")} />
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
