import { getTranslations } from "next-intl/server";

import { FeedbackForm } from "@/components/account/settings-forms";
import { PageHeader } from "@/components/page-header";
import { requireOnboardedAccount } from "@/lib/account/guards";

export default async function FeedbackPage() {
  await requireOnboardedAccount();
  const t = await getTranslations("feedback");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" intro={t("intro")} />
      <FeedbackForm />
    </div>
  );
}
