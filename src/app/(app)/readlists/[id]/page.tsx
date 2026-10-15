import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ReadlistBooks } from "@/components/readlists/readlist-books";
import { ReadlistMenu } from "@/components/readlists/readlist-menu";
import { ReadlistMosaic } from "@/components/readlists/readlist-mosaic";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { searchHref } from "@/lib/books/navigation";
import { READLISTS_PATH } from "@/lib/readlists/links";
import { findReadlist } from "@/lib/readlists/find-readlist.server";

export async function generateMetadata({
  params,
}: PageProps<"/readlists/[id]">): Promise<Metadata> {
  const readlist = await findReadlist((await params).id);
  return readlist ? { title: readlist.name } : {};
}

/**
 * C2 Readlist detail: mosaic, name, description and the books, most recently added first (P40).
 * ⋯ has Edit and Delete. Sharing and Recommend arrive in Sprint 8.
 */
export default async function ReadlistPage({
  params,
}: PageProps<"/readlists/[id]">) {
  const readlist = await findReadlist((await params).id);
  if (!readlist) notFound();
  const t = await getTranslations("readlists");
  const summary = t("bookCount", { count: readlist.bookCount });
  // The search adds books straight to this readlist (P45).
  const addHref = searchHref("", "all", {
    kind: "readlist",
    readlistId: readlist.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Link
          href={READLISTS_PATH}
          aria-label={t("back")}
          className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <ReadlistMenu
          readlist={{ id: readlist.id, name: readlist.name }}
          summary={summary}
        />
      </div>

      <header className="space-y-4">
        <div className="flex items-end gap-4">
          <ReadlistMosaic covers={readlist.mosaic} size="header" />
          <div className="min-w-0 space-y-1 pb-1">
            <h1 className="font-serif text-2xl leading-tight font-semibold break-words">
              {readlist.name}
            </h1>
            <p className="text-sm text-muted">{summary}</p>
          </div>
        </div>
        {readlist.description && (
          <p className="break-words whitespace-pre-line">
            {readlist.description}
          </p>
        )}
        {readlist.books.length > 0 && (
          <ButtonLink href={addHref} className="px-4 text-sm">
            <span aria-hidden="true">+</span>
            {t("addBooks")}
          </ButtonLink>
        )}
      </header>

      {readlist.books.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed text-center">
          <p className="font-semibold">{t("detailEmptyTitle")}</p>
          <p className="text-sm text-muted">{t("detailEmptyText")}</p>
          <ButtonLink href={addHref}>{t("addBook")}</ButtonLink>
        </Card>
      ) : (
        <ReadlistBooks readlistId={readlist.id} books={readlist.books} />
      )}
    </div>
  );
}
