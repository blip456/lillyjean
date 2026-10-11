import { getTranslations } from "next-intl/server";

import { DeleteAccountForm } from "@/components/account/settings-forms";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function DeleteAccountPage() {
  await requireOnboardedAccount();
  const t = await getTranslations("deleteAccount");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <h2 className="font-serif text-xl font-semibold">{t("question")}</h2>
      <p>{t("explanation")}</p>
      <DeleteAccountForm />
    </div>
  );
}
