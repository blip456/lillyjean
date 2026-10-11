import { getTranslations } from "next-intl/server";

import { ChangeEmailForm } from "@/components/account/settings-forms";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function ChangeEmailPage() {
  const { email } = await requireOnboardedAccount();
  const t = await getTranslations("changeEmail");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <ChangeEmailForm current={email} />
    </div>
  );
}
