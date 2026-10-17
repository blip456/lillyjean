import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/back-link";
import {
  canPick,
  firstParam,
} from "@/components/challenges/screens/challenge-view";
import { findChallenge } from "@/components/challenges/screens/find-challenge.server";
import { OwnPickForm } from "@/components/challenges/screens/own-pick-form";
import { getBook } from "@/lib/books/queries.server";
import type { BookListItem } from "@/lib/books/types";
import { bookIdSchema } from "@/lib/books/validation";
import { challengeHref } from "@/lib/challenges/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("challengeScreens");
  return { title: t("ownPickTitle") };
}

/** The book added by hand (D3) that came back as `?added=<id>`, or null. */
async function findAdded(value: string): Promise<BookListItem | null> {
  const id = bookIdSchema.safeParse(value);
  if (!id.success) return null;
  const book = await getBook(id.data);
  return (
    book && {
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      status: book.status,
      progress: book.progress,
      readCount: book.readCount,
    }
  );
}

/**
 * E5 Submit my own pick: the challenge title and theme as a reminder, the book search and
 * "Use as my pick". A completed challenge has nothing to pick: back to E4.
 */
export default async function OwnPickPage({
  params,
  searchParams,
}: PageProps<"/challenges/[id]/pick">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [challenge, added, t] = await Promise.all([
    findChallenge(id),
    findAdded(firstParam(query.added)),
    getTranslations("challengeScreens"),
  ]);
  if (!challenge) notFound();
  if (!canPick(challenge.state)) redirect(challengeHref(challenge.id));

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex min-h-11 items-center gap-2">
          <BackLink fallback={challengeHref(challenge.id)} />
          <p className="min-w-0 truncate font-semibold">{challenge.title}</p>
        </div>
        <h1 className="font-serif text-3xl leading-tight font-semibold">
          {t("ownPickTitle")}
        </h1>
        {challenge.theme && (
          <div className="space-y-1">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              {t("theme")}
            </h2>
            <p className="break-words whitespace-pre-line">{challenge.theme}</p>
          </div>
        )}
      </header>
      <OwnPickForm
        challengeId={challenge.id}
        added={added}
        fromChallenge={firstParam(query.from) === "challenge"}
      />
    </div>
  );
}
