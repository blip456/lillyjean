import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ChallengeForm } from "@/components/challenges/form/challenge-form";
import { ChallengeFormHeader } from "@/components/challenges/form/challenge-form-header";
import { appToday } from "@/lib/challenges/dates";
import { CHALLENGES_PATH } from "@/lib/challenges/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("challengeForm");
  return { title: t("newTitle") };
}

/**
 * E6 Create challenge, from the + menu (N2) and the Challenges tab. The start date is prefilled
 * with today: most personal challenges start right away, and a later date makes it Upcoming.
 */
export default async function NewChallengePage() {
  const t = await getTranslations("challengeForm");

  return (
    <div className="space-y-6">
      <ChallengeFormHeader
        title={t("newTitle")}
        closeHref={CHALLENGES_PATH}
        closeLabel={t("close")}
      />
      <ChallengeForm mode="create" defaultStartsOn={appToday()} />
    </div>
  );
}
