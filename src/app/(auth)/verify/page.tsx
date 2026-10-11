import { useTranslations } from "next-intl";
import { use } from "react";

import { VerifyForm } from "@/components/auth/verify-form";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { codeFlowSchema, emailSchema } from "@/lib/validation";

const titles = {
  signup: "titleSignup",
  login: "titleLogin",
  recovery: "titleRecovery",
  email_change: "titleEmailChange",
} as const;

const editHrefs = {
  signup: "/signup",
  login: "/login/code",
  recovery: "/forgot-password",
  email_change: "/settings/email",
} as const;

export default function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const t = useTranslations("verify");
  const params = use(searchParams);
  const flow = codeFlowSchema.safeParse(params.flow);
  const email = emailSchema.safeParse(params.email);

  if (!flow.success || !email.success) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("titleSignup")}
          backHref="/welcome"
          intro={t("missingEmail")}
        />
        <ButtonLink href="/welcome" block>
          {t("submitRecovery")}
        </ButtonLink>
      </div>
    );
  }

  const editHref =
    flow.data === "email_change"
      ? editHrefs.email_change
      : `${editHrefs[flow.data]}?email=${encodeURIComponent(email.data)}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t(titles[flow.data])} backHref={editHref} />
      <VerifyForm flow={flow.data} email={email.data} editHref={editHref} />
    </div>
  );
}
