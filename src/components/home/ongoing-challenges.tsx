import { getTranslations } from "next-intl/server";

import { ChallengeCard } from "@/components/challenges/challenge-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { CHALLENGES_PATH, NEW_CHALLENGE_PATH } from "@/lib/challenges/links";
import type { ChallengeSummary } from "@/lib/challenges/types";

/** Challenges in the Home section; "All (n)" opens the Challenges tab (E1). */
const HOME_CHALLENGES_LIMIT = 3;

/**
 * "Ongoing challenges" on Home (B1, S5): running challenges, then upcoming ones (the order of
 * `getMyChallenges().active`), with "All (n)" → E1, or an empty state with "New challenge" → E6.
 */
export async function OngoingChallenges({
  challenges,
  today,
}: {
  challenges: ChallengeSummary[];
  today: string;
}) {
  const t = await getTranslations("home");

  return (
    <section aria-labelledby="ongoing-challenges" className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <h2
          id="ongoing-challenges"
          className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
        >
          {t("ongoingChallenges")}
        </h2>
        {challenges.length > 0 && (
          <Link
            href={CHALLENGES_PATH}
            aria-label={t("allChallengesLabel", { count: challenges.length })}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            {t("allChallenges", { count: challenges.length })}
          </Link>
        )}
      </div>
      {challenges.length === 0 ? (
        <Card className="flex items-center gap-4 border-dashed">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("challengesEmptyTitle")}</p>
            <p className="text-sm text-muted">{t("challengesEmptyText")}</p>
          </div>
          <ButtonLink
            href={NEW_CHALLENGE_PATH}
            variant="secondary"
            className="shrink-0 px-4"
          >
            {t("newChallenge")}
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {challenges.slice(0, HOME_CHALLENGES_LIMIT).map((challenge) => (
            <li key={challenge.id}>
              <ChallengeCard challenge={challenge} today={today} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
