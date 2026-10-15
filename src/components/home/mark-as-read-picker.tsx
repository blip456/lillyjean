"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { MarkAsReadSheet } from "@/components/books/mark-as-read-sheet";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { searchHref } from "@/lib/books/navigation";
import type { BookListItem } from "@/lib/books/types";

/** Books found from here are marked as read too (P45). */
const SEARCH_TO_READ = searchHref("", "all", {
  kind: "status",
  status: "read",
});

/**
 * The books you are reading as buttons; picking one opens the mark-as-read sheet (D4). After
 * saving, Home shows the new count and the snackbar offers Undo.
 */
export function MarkAsReadPicker({ books }: { books: BookListItem[] }) {
  const t = useTranslations("markAsReadPicker");
  const tBooks = useTranslations("books");
  const router = useRouter();
  const [book, setBook] = useState<BookListItem | null>(null);
  const [open, setOpen] = useState(false);

  if (books.length === 0) {
    return (
      <Card className="space-y-4 border-dashed text-center">
        <p>{t("empty")}</p>
        <ButtonLink href={SEARCH_TO_READ}>{t("search")}</ButtonLink>
      </Card>
    );
  }

  return (
    <>
      <section aria-labelledby="reading-books" className="space-y-2">
        <h2
          id="reading-books"
          className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
        >
          {t("readingList")}
        </h2>
        <ul className="divide-y divide-border">
          {books.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setBook(item);
                  setOpen(true);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left"
              >
                <BookCover
                  title={item.title}
                  coverUrl={item.coverUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {item.title}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {item.authors.join(", ") || tBooks("unknownAuthor")}
                  </span>
                </span>
                {item.progress !== null && (
                  <span className="shrink-0 text-sm text-muted">
                    {tBooks("progress", { progress: item.progress })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm">
        {t("notInList")}{" "}
        <Link
          href={SEARCH_TO_READ}
          className="font-semibold underline underline-offset-4"
        >
          {t("search")}
        </Link>
      </p>
      {book && (
        <MarkAsReadSheet
          book={book}
          open={open}
          onClose={() => setOpen(false)}
          onMarked={() => router.push("/")}
        />
      )}
    </>
  );
}
