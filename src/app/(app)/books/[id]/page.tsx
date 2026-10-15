import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AddToReadlistButton } from "@/components/books/add-to-readlist-button";
import { BackLink } from "@/components/back-link";
import { BookCover } from "@/components/books/book-cover";
import { BookDescription } from "@/components/books/book-description";
import { BookDetailMenu } from "@/components/books/book-detail-menu";
import { BookStatusControl } from "@/components/books/book-status-control";
import { RatingStars } from "@/components/books/rating-stars";
import { Link } from "@/components/ui/link";
import { goodreadsUrl } from "@/lib/books/links";
import { getBook } from "@/lib/books/queries.server";
import { bookIdSchema } from "@/lib/books/validation";
import { getReadlistsWithBook } from "@/lib/readlists/book-readlists.server";

async function findBook(id: string) {
  if (!bookIdSchema.safeParse(id).success) return null;
  return getBook(id);
}

export async function generateMetadata({
  params,
}: PageProps<"/books/[id]">): Promise<Metadata> {
  const book = await findBook((await params).id);
  return book ? { title: book.title } : {};
}

/**
 * D2 Book detail: cover, title, author, Google rating, my status, "+ Add to readlist" (C4),
 * Goodreads link, the description and the readlists that hold the book. Challenges (S5) and
 * friends' ratings (S8) come later.
 */
export default async function BookDetailPage({
  params,
}: PageProps<"/books/[id]">) {
  const book = await findBook((await params).id);
  if (!book) notFound();
  const [t, readlists] = await Promise.all([
    getTranslations(),
    getReadlistsWithBook(book.id),
  ]);
  const authors = book.authors.join(", ") || t("books.unknownAuthor");

  return (
    <div className="space-y-6">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <BackLink />
        <BookDetailMenu book={book} />
      </div>

      <div className="flex items-end gap-5">
        <BookCover title={book.title} coverUrl={book.coverUrl} size="lg" />
        <div className="min-w-0 space-y-1 pb-1">
          <h1 className="font-serif text-2xl leading-tight font-semibold break-words">
            {book.title}
          </h1>
          <p>{authors}</p>
          {book.publishedYear && (
            <p className="text-sm text-muted">
              {t("bookDetail.published", { year: String(book.publishedYear) })}
            </p>
          )}
        </div>
      </div>

      {book.googleRating !== null && (
        <Section title={t("bookDetail.ratings")}>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm">{t("bookDetail.googleRating")}</span>
            <RatingStars rating={book.googleRating} />
          </div>
        </Section>
      )}

      <section aria-labelledby="my-status" className="space-y-3">
        <h2 id="my-status" className="font-semibold">
          {t("books.myStatus")}
        </h2>
        <BookStatusControl book={book} />
      </section>

      <AddToReadlistButton book={book} />

      <a
        href={goodreadsUrl(book)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-5 font-semibold hover:bg-border/40"
      >
        {t("bookDetail.goodreads")}
        <span aria-hidden="true">↗</span>
        <span className="sr-only">{t("bookDetail.newTab")}</span>
      </a>

      {book.description && (
        <Section title={t("bookDetail.about")}>
          <BookDescription text={book.description} />
        </Section>
      )}

      {readlists.length > 0 && (
        <Section title={t("bookDetail.inYourReadlists")}>
          <ul className="flex flex-wrap gap-2">
            {readlists.map((list) => (
              <li key={list.id} className="max-w-full">
                <Link
                  href={`/readlists/${list.id}`}
                  className="inline-flex min-h-11 max-w-full items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold hover:bg-border/40"
                >
                  <span className="truncate">{list.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
