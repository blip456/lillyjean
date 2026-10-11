import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { BackLink } from "@/components/books/back-link";
import { BookCover } from "@/components/books/book-cover";
import { BookDescription } from "@/components/books/book-description";
import { BookDetailMenu } from "@/components/books/book-detail-menu";
import { BookStatusControl } from "@/components/books/book-status-control";
import { RatingStars } from "@/components/books/rating-stars";
import { goodreadsUrl } from "@/lib/books/links";
import { getBook } from "@/lib/books/queries.server";
import { bookIdSchema } from "@/lib/books/validation";

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
 * D2 Book detail: cover, title, author, Google rating, my status, Goodreads link and the
 * description. Readlists (S4), challenges (S5) and friends' ratings (S8) come later.
 */
export default async function BookDetailPage({
  params,
}: PageProps<"/books/[id]">) {
  const book = await findBook((await params).id);
  if (!book) notFound();
  const t = await getTranslations();
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
