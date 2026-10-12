import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LibraryCardStep } from "@/components/account/library-card-step";
import { OnboardingStep } from "@/components/account/onboarding-step";
import { PageHeader } from "@/components/page-header";
import { requireAccount } from "@/lib/account/guards";

export default async function LibraryCardPage() {
  const account = await requireAccount();
  if (account.profile.username) redirect("/");
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("onboarding.libraryCard.title")}
        intro={t("onboarding.libraryCard.intro")}
        aside={<OnboardingStep step={1} />}
      />
      <LibraryCardStep memberSince={account.profile.created_at} />
    </div>
  );
}
