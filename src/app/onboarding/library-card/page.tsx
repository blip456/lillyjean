import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LibraryCardStep } from "@/components/account/library-card-step";
import { PageHeader } from "@/components/page-header";
import { requireAccount } from "@/lib/account/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";

export default async function LibraryCardPage() {
  const account = await requireAccount();
  if (account.profile.username) redirect("/");
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("onboarding.libraryCard.title")}
        intro={t("onboarding.libraryCard.intro")}
        aside={
          <StepLabel
            label={t("common.stepOf", { step: 1, total: ONBOARDING_STEPS })}
          />
        }
      />
      <LibraryCardStep memberSince={account.profile.created_at} />
    </div>
  );
}

function StepLabel({ label }: { label: string }) {
  return <span className="text-sm font-semibold text-muted">{label}</span>;
}
