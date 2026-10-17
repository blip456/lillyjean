import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ChallengeForm } from "@/components/challenges/form/challenge-form";
import { ChallengeFormHeader } from "@/components/challenges/form/challenge-form-header";
import { challengeHref } from "@/lib/challenges/links";
import { getChallenge } from "@/lib/challenges/queries.server";
import { challengeIdSchema } from "@/lib/challenges/validation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("challengeForm");
  return { title: t("editTitle") };
}

/**
 * E8 Edit challenge, for its creator only. Before the start it is the E6 form, prefilled; after
 * the start the title and theme are locked and the dates and candidates can change (P49).
 */
export default async function EditChallengePage({
  params,
}: PageProps<"/challenges/[id]/edit">) {
  const { id } = await params;
  const [challenge, t] = await Promise.all([
    challengeIdSchema.safeParse(id).success ? getChallenge(id) : null,
    getTranslations("challengeForm"),
  ]);
  if (!challenge?.isOwner) notFound();

  return (
    <div className="space-y-6">
      <ChallengeFormHeader
        title={t("editTitle")}
        closeHref={challengeHref(challenge.id)}
        closeLabel={t("close")}
      />
      <ChallengeForm
        mode="edit"
        challenge={{
          id: challenge.id,
          title: challenge.title,
          theme: challenge.theme,
          startsOn: challenge.startsOn,
          endsOn: challenge.endsOn,
          started: challenge.started,
          candidates: challenge.candidates.map((book) => ({
            id: book.id,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverUrl,
          })),
          pickId:
            challenge.pick && !challenge.pick.isOwnPick
              ? challenge.pick.id
              : null,
        }}
      />
    </div>
  );
}
