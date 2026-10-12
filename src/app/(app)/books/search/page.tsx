import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BookSearch } from "@/components/books/book-search";
import { PageHeader } from "@/components/page-header";
import { isSearchable, readSearchParams } from "@/lib/books/navigation";
import { BookSearchUnavailableError } from "@/lib/books/providers";
import { searchBooks } from "@/lib/books/queries.server";
import type { BookListItem } from "@/lib/books/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bookSearch");
  return { title: t("title") };
}

/** D1 Book search. The results for `?q=` are rendered here, so the search survives a refresh. */
export default async function BookSearchPage({
  searchParams,
}: PageProps<"/books/search">) {
  const t = await getTranslations("bookSearch");
  const { query, field } = readSearchParams(await searchParams);

  let results: BookListItem[] = [];
  let error: string | null = null;
  if (isSearchable(query)) {
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

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/" />
      <BookSearch query={query} field={field} results={results} error={error} />
    </div>
  );
}
