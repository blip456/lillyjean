import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AddBookForm } from "@/components/books/add-book-form";
import { Link } from "@/components/ui/link";
import {
  addBookCloseHref,
  manualEntryReadlist,
  manualEntryStatus,
  safeReturnTo,
  type SearchTarget,
} from "@/lib/books/navigation";
import { MAX_TITLE_LENGTH } from "@/lib/books/sanitize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("addBook");
  return { title: t("title") };
}

/**
 * D3 Add a book manually. `?title=` comes from the search text; `?returnTo=` (e.g. onboarding)
 * is where the form goes after adding and where × leads. From a search opened on a shelf list
 * or a readlist (P45), `?status=` picks the status and `?readlist=` adds the book to that list.
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
  const status = manualEntryStatus(params.status);
  const readlistId = manualEntryReadlist(params.readlist);
  const target: SearchTarget | null = readlistId
    ? { kind: "readlist", readlistId }
    : params.status
      ? { kind: "status", status }
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex min-h-11 items-center">
          <Link
            href={addBookCloseHref(returnTo, title, target)}
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
      <AddBookForm
        defaultTitle={title}
        defaultStatus={status}
        readlistId={readlistId}
        returnTo={returnTo}
      />
    </div>
  );
}
