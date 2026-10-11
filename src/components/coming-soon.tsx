import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMING_SOON_SPRINT, type ComingSoonFeature } from "@/lib/navigation";
import { getSprintVersion } from "@/lib/release/roadmap.server";

/**
 * A tab whose sprint has not shipped yet (Readlists, Challenges, Friends): says which version
 * brings it, read from docs/backlog.md, and links to What's coming.
 */
export async function ComingSoon({ feature }: { feature: ComingSoonFeature }) {
  const t = await getTranslations("comingSoon");
  const version = await getSprintVersion(COMING_SOON_SPRINT[feature]);

  return (
    <div className="space-y-6">
      <PageHeader title={t(`${feature}.title`)} />
      <Card className="space-y-4">
        <span className="inline-block rounded-full border border-border px-3 py-0.5 text-sm font-semibold">
          {t("badge")}
        </span>
        <p>{t(`${feature}.text`)}</p>
        <p className="font-semibold">
          {version ? t("arrivesIn", { version }) : t("arrivesLater")}
        </p>
        <ButtonLink href="/whats-coming" variant="secondary">
          {t("whatsComing")}
        </ButtonLink>
      </Card>
    </div>
  );
}
