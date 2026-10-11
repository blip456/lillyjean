import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CurrentlyReadingStep } from "@/components/account/currently-reading-step";
import { OnboardingStep } from "@/components/account/onboarding-step";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { getBook, getMyBooks } from "@/lib/books/queries.server";
import type { BookListItem } from "@/lib/books/types";
import { bookIdSchema } from "@/lib/books/validation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.currentlyReading");
  return { title: t("title") };
}

/**
 * Onboarding step 2 (A10): optional. Books chosen here are Reading and show up on Home. Coming
 * back from "Add it manually" (D3) brings `?added=<book id>`, which is chosen as well.
 */
export default async function CurrentlyReadingPage({
  searchParams,
}: PageProps<"/onboarding/currently-reading">) {
  await requireOnboardedAccount();
  const t = await getTranslations("onboarding.currentlyReading");
  const { added } = await searchParams;
  const chosen = await getMyBooks("reading");

  const addedId = bookIdSchema.safeParse(added);
  let addedBook: BookListItem | null = null;
  if (addedId.success && !chosen.some((book) => book.id === addedId.data)) {
    const book = await getBook(addedId.data);
    if (book)
      addedBook = {
        id: book.id,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        status: book.status,
        progress: book.progress,
        readCount: book.readCount,
      };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        aside={<OnboardingStep step={2} />}
      />
      <CurrentlyReadingStep initialChosen={chosen} added={addedBook} />
    </div>
  );
}
