import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { CHALLENGES_PATH } from "@/lib/challenges/links";

/** E8 for an unknown id, or a challenge someone else created. */
export default async function EditChallengeNotFound() {
  const t = await getTranslations("challengeForm.notFound");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        backHref={CHALLENGES_PATH}
        intro={t("text")}
      />
      <ButtonLink href={CHALLENGES_PATH} block>
        {t("all")}
      </ButtonLink>
    </div>
  );
}
