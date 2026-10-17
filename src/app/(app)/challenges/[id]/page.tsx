import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { BackLink } from "@/components/back-link";
import { ChallengeMenu } from "@/components/challenges/screens/challenge-menu";
import { ChallengePicks } from "@/components/challenges/screens/challenge-picks";
import { canPick } from "@/components/challenges/screens/challenge-view";
import { findChallenge } from "@/components/challenges/screens/find-challenge.server";
import { CHALLENGES_PATH } from "@/lib/challenges/links";

export async function generateMetadata({
  params,
}: PageProps<"/challenges/[id]">): Promise<Metadata> {
  const challenge = await findChallenge((await params).id);
  return challenge ? { title: challenge.title } : {};
}

/**
 * E4 Challenge detail: kind, title, dates, theme and the rule in plain words (P13), my pick and
 * the candidate books (P12), "Submit my own pick" (E5, P11). ⋯ has Edit and Delete for the
 * creator. A completed challenge is read-only. Participants (S8) and the official variant (S6)
 * come later.
 */
export default async function ChallengePage({
  params,
}: PageProps<"/challenges/[id]">) {
  const { id } = await params;
  const [challenge, t, format] = await Promise.all([
    findChallenge(id),
    getTranslations(),
    getFormatter(),
  ]);
  if (!challenge) notFound();

  const date = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  const completed = challenge.state === "completed";
  const readOnly = !canPick(challenge.state);
  const canEdit = challenge.isOwner && !completed;

  return (
    <div className="space-y-6">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <BackLink fallback={CHALLENGES_PATH} />
        {(canEdit || challenge.canDelete) && (
          <ChallengeMenu
            challenge={{ id: challenge.id, title: challenge.title }}
            canEdit={canEdit}
            canDelete={challenge.canDelete}
          />
        )}
      </div>

      <header className="space-y-3">
        <span className="inline-block rounded-full border border-border px-2 py-0.5 text-xs font-semibold tracking-wide text-muted uppercase">
          {t(`challenges.kind.${challenge.kind}`)}
        </span>
        <h1 className="font-serif text-2xl leading-tight font-semibold break-words">
          {challenge.title}
        </h1>
        <p className="text-sm text-muted">
          {t("challengeScreens.starts", { date: date(challenge.startsOn) })}
          {" · "}
          {challenge.endsOn
            ? t("challengeScreens.ends", { date: date(challenge.endsOn) })
            : t("challengeScreens.noEnd")}
        </p>
        {challenge.theme && (
          <div className="space-y-1">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              {t("challengeScreens.theme")}
            </h2>
            <p className="break-words whitespace-pre-line select-text">
              {challenge.theme}
            </p>
          </div>
        )}
        <p className="rounded-xl bg-border/40 px-4 py-3 text-sm">
          {t("challengeScreens.rules")}
        </p>
      </header>

      <ChallengePicks
        challengeId={challenge.id}
        pick={challenge.pick}
        candidates={challenge.candidates}
        readOnly={readOnly}
        completedLine={
          completed && challenge.completedOn
            ? t("challengeScreens.completedLine", {
                date: date(challenge.completedOn),
                title: challenge.pick?.title ?? "",
              })
            : undefined
        }
      />
    </div>
  );
}
