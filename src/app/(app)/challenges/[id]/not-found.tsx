import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { CHALLENGES_PATH } from "@/lib/challenges/links";

/** Unknown, invalid, missed or someone else's challenge (E4, E5). */
export default async function ChallengeNotFound() {
  const t = await getTranslations("challengeScreens");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notFound")}
        backHref={CHALLENGES_PATH}
        intro={t("notFoundText")}
      />
      <ButtonLink href={CHALLENGES_PATH} block>
        {t("allChallenges")}
      </ButtonLink>
    </div>
  );
}
