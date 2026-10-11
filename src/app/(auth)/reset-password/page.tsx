import { useTranslations } from "next-intl";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageHeader } from "@/components/page-header";

/** Reached after a correct recovery code; the proxy only lets signed-in users in. */
export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <ResetPasswordForm />
    </div>
  );
}
