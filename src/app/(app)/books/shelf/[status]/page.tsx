import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookRow } from "@/components/books/book-row";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchHref } from "@/lib/books/navigation";
import { getMyBooks } from "@/lib/books/queries.server";
import { shelfStatus } from "@/lib/books/shelves";

/** Enough for every shelf in v1; lists are not paged yet. */
const SHELF_LIMIT = 500;

export async function generateMetadata({
  params,
}: PageProps<"/books/shelf/[status]">): Promise<Metadata> {
  const status = shelfStatus((await params).status);
  if (!status) return {};
  const t = await getTranslations("bookStatus.shelf");
  return { title: t(`title.${status}`) };
}

/**
 * Shelf list (B4: "Want to read", "Reading", "Read"): my books with one status, most recently
 * changed first, as swipeable rows. Opened from "All (n)" on Home.
 */
export default async function ShelfPage({
  params,
}: PageProps<"/books/shelf/[status]">) {
  const status = shelfStatus((await params).status);
  if (!status) notFound();

  const t = await getTranslations("bookStatus.shelf");
  const books = await getMyBooks(status, SHELF_LIMIT);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`title.${status}`)}
        backHref="/"
        backToPrevious
        intro={t("count", { count: books.length })}
      />
      {books.length === 0 ? (
        <Card className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">
            {t(`empty.${status}.title`)}
          </h2>
          <p className="text-muted">{t(`empty.${status}.text`)}</p>
          <ButtonLink
            href={searchHref("", "all", { kind: "status", status })}
            variant="secondary"
          >
            {t("findBook")}
          </ButtonLink>
        </Card>
      ) : (
        <ul className="divide-y divide-border">
          {books.map((book) => (
            <li key={book.id} className="py-1">
              <BookRow book={book} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
