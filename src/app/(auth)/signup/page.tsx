import { useTranslations } from "next-intl";
import { use } from "react";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { PageHeader } from "@/components/page-header";

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const t = useTranslations("signup");
  const { email } = use(searchParams);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/welcome" />
      <SignUpForm
        defaultEmail={typeof email === "string" ? email : undefined}
      />
    </div>
  );
}
