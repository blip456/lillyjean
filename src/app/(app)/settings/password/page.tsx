import { getTranslations } from "next-intl/server";

import { ChangePasswordForm } from "@/components/account/settings-forms";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function ChangePasswordPage() {
  await requireOnboardedAccount();
  const t = await getTranslations("changePassword");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <ChangePasswordForm />
    </div>
  );
}
