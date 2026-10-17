import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ChallengeCard } from "@/components/challenges/challenge-card";
import {
  ChallengesHeader,
  sectionTitle,
} from "@/components/challenges/screens/challenges-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { appToday } from "@/lib/challenges/dates";
import { NEW_CHALLENGE_PATH } from "@/lib/challenges/links";
import {
  countCompletedChallenges,
  getMyChallenges,
} from "@/lib/challenges/queries.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("challengeScreens");
  return { title: t("title") };
}

/**
 * E1 Challenges · Active: the challenges I am in that run now (ending soonest first), then the
 * upcoming ones under "Upcoming". Missed challenges are not shown (P13). One round of queries
 * (T21): the account check, my challenges and the counter share one cached load.
 */
export default async function ChallengesPage() {
  const [{ profile }, t, { active }, completedCount] = await Promise.all([
    requireOnboardedAccount(),
    getTranslations("challengeScreens"),
    getMyChallenges(),
    countCompletedChallenges(),
  ]);
  const today = appToday();
  const running = active.filter((challenge) => challenge.state === "active");
  const upcoming = active.filter((challenge) => challenge.state === "upcoming");

  return (
    <div className="space-y-6">
      <ChallengesHeader
        username={profile.username}
        view="active"
        completedCount={completedCount}
      />

      {active.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed text-center">
          <p className="font-semibold">{t("emptyActiveTitle")}</p>
          <p className="text-sm text-muted">{t("emptyActiveText")}</p>
          <ButtonLink href={NEW_CHALLENGE_PATH}>{t("newChallenge")}</ButtonLink>
        </Card>
      ) : (
        <>
          {running.length > 0 && (
            <ul aria-label={t("running")} className="space-y-3">
              {running.map((challenge) => (
                <li key={challenge.id}>
                  <ChallengeCard challenge={challenge} today={today} />
                </li>
              ))}
            </ul>
          )}
          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming" className="space-y-3">
              <h2 id="upcoming" className={sectionTitle}>
                {t("upcoming")}
              </h2>
              <ul className="space-y-3">
                {upcoming.map((challenge) => (
                  <li key={challenge.id}>
                    <ChallengeCard challenge={challenge} today={today} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
