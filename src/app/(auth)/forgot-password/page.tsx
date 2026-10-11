import { useTranslations } from "next-intl";
import { use } from "react";

import { EmailCodeForm } from "@/components/auth/email-code-form";
import { PageHeader } from "@/components/page-header";

export default function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const t = useTranslations("forgot");
  const { email } = use(searchParams);
  const defaultEmail = typeof email === "string" ? email : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/login" intro={t("intro")} />
      <EmailCodeForm
        purpose="recovery"
        emailLabel={t("email")}
        submitLabel={t("submit")}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}
