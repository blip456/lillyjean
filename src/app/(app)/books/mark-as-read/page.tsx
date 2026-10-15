import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarkAsReadPicker } from "@/components/home/mark-as-read-picker";
import { PageHeader } from "@/components/page-header";
import { getMyBooks } from "@/lib/books/queries.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("markAsReadPicker");
  return { title: t("title") };
}

/** + menu → Mark as read (N2): pick one of the books you are reading, then D4. */
export default async function MarkAsReadPage() {
  const t = await getTranslations("markAsReadPicker");
  const books = await getMyBooks("reading");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        backHref="/"
        backToPrevious
        intro={t("intro")}
      />
      <MarkAsReadPicker books={books} />
    </div>
  );
}
