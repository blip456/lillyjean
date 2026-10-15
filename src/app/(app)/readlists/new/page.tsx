import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ReadlistForm } from "@/components/readlists/readlist-form";
import { ReadlistFormHeader } from "@/components/readlists/readlist-form-header";
import { READLISTS_PATH, readNewReadlistParams } from "@/lib/readlists/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("readlists.form");
  return { title: t("newTitle") };
}

/**
 * C3 New readlist, from the + menu, Home, the overview or a book (C4). `?bookId=` puts that book
 * in the new list; `?returnTo=` (same-site only) is where it goes after creating, instead of the
 * new list, and where × leads when the form was opened directly.
 */
export default async function NewReadlistPage({
  searchParams,
}: PageProps<"/readlists/new">) {
  const t = await getTranslations("readlists.form");
  const { bookId, returnTo } = readNewReadlistParams(await searchParams);

  return (
    <div className="space-y-6">
      <ReadlistFormHeader
        title={t("newTitle")}
        closeHref={returnTo ?? READLISTS_PATH}
        closeLabel={t("close")}
      />
      <ReadlistForm mode="create" bookId={bookId} returnTo={returnTo} />
    </div>
  );
}
