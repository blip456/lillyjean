import { getTranslations } from "next-intl/server";

import { PledgeForm } from "@/components/account/pledge-form";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function ChangePledgePage() {
  const { pledge, year } = await requireOnboardedAccount();
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("changePledge.title")}
        backHref="/settings"
        intro={t("changePledge.intro", { year })}
      />
      <PledgeForm
        context="settings"
        initialGoal={pledge}
        submitLabel={t("common.save")}
      />
    </div>
  );
}
