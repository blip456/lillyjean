import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type AddTarget, BookSearch } from "@/components/books/book-search";
import type { ChallengeIndicator } from "@/components/challenges/integration/indicator";
import {
  getBookIndicators,
  preloadBookIndicators,
} from "@/components/challenges/integration/indicators.server";
import { PageHeader } from "@/components/page-header";
import {
  isSearchable,
  readSearchParams,
  type SearchTarget,
  targetHref,
} from "@/lib/books/navigation";
import { BookSearchUnavailableError } from "@/lib/books/providers";
import { searchBooks } from "@/lib/books/queries.server";
import type { BookListItem } from "@/lib/books/types";
import { findReadlist } from "@/lib/readlists/find-readlist.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bookSearch");
  return { title: t("title") };
}

/**
 * The target with what the screen needs: for a readlist its name and books, so each result
 * shows whether it is already in there. An unknown readlist becomes a plain search.
 */
async function loadTarget(
  target: SearchTarget | null,
): Promise<AddTarget | null> {
  if (target?.kind !== "readlist") return target;
  const readlist = await findReadlist(target.readlistId);
  if (!readlist) return null;
  return {
    ...target,
    name: readlist.name,
    bookIds: readlist.books.map((book) => book.id),
  };
}

/**
 * D1 Book search. The results for `?q=` are rendered here, so the search survives a refresh.
 * Opened from a shelf list or a readlist, adding a book does what that page is about (P45).
 */
export default async function BookSearchPage({
  searchParams,
}: PageProps<"/books/search">) {
  const t = await getTranslations("bookSearch");
  const tBooks = await getTranslations("books");
  const params = readSearchParams(await searchParams);
  const { query, field } = params;
  const target = await loadTarget(params.target);

  let results: BookListItem[] = [];
  let indicators: Record<string, ChallengeIndicator> = {};
  let error: string | null = null;
  if (isSearchable(query)) {
    // My challenges load while the book databases are searched (T21).
    preloadBookIndicators();
    try {
      results = await searchBooks(query, field);
    } catch (cause) {
      if (cause instanceof BookSearchUnavailableError) {
        error = "searchUnavailable";
      } else {
        console.error(cause);
        error = "unknown";
      }
    }
  }

  if (results.length)
    indicators = await getBookIndicators(results.map((book) => book.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        backHref={targetHref(target)}
        backToPrevious
        intro={
          target &&
          t("addingTo", {
            list:
              target.kind === "readlist"
                ? target.name
                : tBooks(`status.${target.status}`),
          })
        }
      />
      <BookSearch
        query={query}
        field={field}
        results={results}
        error={error}
        target={target}
        indicators={indicators}
      />
    </div>
  );
}
