import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ChallengeCard } from "@/components/challenges/challenge-card";
import { ChallengesHeader } from "@/components/challenges/screens/challenges-header";
import { Card } from "@/components/ui/card";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { appToday } from "@/lib/challenges/dates";
import { getMyChallenges } from "@/lib/challenges/queries.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("challengeScreens");
  return { title: `${t("past")} · ${t("title")}` };
}

/**
 * E3 Challenges · Past: completed challenges only, most recent first (P13). Challenges that
 * ended without a completion simply disappear. Each card opens the read-only challenge (E4).
 */
export default async function PastChallengesPage() {
  const [{ profile }, t, { past }] = await Promise.all([
    requireOnboardedAccount(),
    getTranslations("challengeScreens"),
    getMyChallenges(),
  ]);
  const today = appToday();

  return (
    <div className="space-y-6">
      <ChallengesHeader
        username={profile.username}
        view="past"
        completedCount={past.length}
      />

      {past.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed text-center">
          <p className="font-semibold">{t("emptyPastTitle")}</p>
          <p className="text-sm text-muted">{t("emptyPastText")}</p>
        </Card>
      ) : (
        <ul aria-label={t("completed")} className="space-y-3">
          {past.map((challenge) => (
            <li key={challenge.id}>
              <ChallengeCard challenge={challenge} today={today} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-muted">{t("pastNote")}</p>
    </div>
  );
}
