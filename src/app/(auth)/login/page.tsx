import { useTranslations } from "next-intl";
import { use } from "react";

import { LogInForm } from "@/components/auth/log-in-form";
import { PageHeader } from "@/components/page-header";

export default function LogInPage({ searchParams }: PageProps<"/login">) {
  const t = useTranslations("login");
  const { email } = use(searchParams);
  const defaultEmail = typeof email === "string" ? email : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/welcome" />
      <LogInForm defaultEmail={defaultEmail} />
    </div>
  );
}
