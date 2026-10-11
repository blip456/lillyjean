import { getTranslations } from "next-intl/server";

import { OnboardingStep } from "@/components/account/onboarding-step";
import { PledgeForm } from "@/components/account/pledge-form";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";

export default async function PledgePage() {
  const account = await requireOnboardedAccount();
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("onboarding.pledge.title")}
        intro={t("onboarding.pledge.intro")}
        backHref="/onboarding/currently-reading"
        aside={<OnboardingStep step={ONBOARDING_STEPS} />}
      />
      <PledgeForm
        context="onboarding"
        initialGoal={account.pledge}
        submitLabel={t("onboarding.pledge.finish")}
      />
    </div>
  );
}
