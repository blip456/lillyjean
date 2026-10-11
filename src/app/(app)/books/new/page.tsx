import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AddBookForm } from "@/components/books/add-book-form";
import { Link } from "@/components/ui/link";
import { addBookCloseHref, safeReturnTo } from "@/lib/books/navigation";
import { MAX_TITLE_LENGTH } from "@/lib/books/sanitize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("addBook");
  return { title: t("title") };
}

/**
 * D3 Add a book manually. `?title=` comes from the search text; `?returnTo=` (e.g. onboarding)
 * is where the form goes after adding and where × leads.
 */
export default async function AddBookPage({
  searchParams,
}: PageProps<"/books/new">) {
  const t = await getTranslations("addBook");
  const params = await searchParams;
  const title =
    typeof params.title === "string"
      ? params.title.trim().slice(0, MAX_TITLE_LENGTH)
      : "";
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex min-h-11 items-center">
          <Link
            href={addBookCloseHref(returnTo, title)}
            aria-label={t("close")}
            className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl"
          >
            <span aria-hidden="true">×</span>
          </Link>
        </div>
        <h1 className="font-serif text-3xl leading-tight font-semibold">
          {t("title")}
        </h1>
      </header>
      <AddBookForm defaultTitle={title} returnTo={returnTo} />
    </div>
  );
}
