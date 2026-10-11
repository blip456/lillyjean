import { useTranslations } from "next-intl";
import { use } from "react";

import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export default function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const t = useTranslations();
  const { deleted } = use(searchParams);

  return (
    <div className="flex flex-1 flex-col justify-between gap-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={96}
          height={96}
          className="rounded-3xl"
        />
        <h1 className="font-serif text-3xl leading-tight font-semibold">
          {t("welcome.title")}
        </h1>
      </div>
      <div className="space-y-3">
        {deleted && (
          <FormMessage tone="success" message={t("welcome.deleted")} />
        )}
        <ButtonLink href="/signup" block>
          {t("welcome.createAccount")}
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" block>
          {t("welcome.logIn")}
        </ButtonLink>
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
          {t("common.googleLater")}
        </p>
      </div>
    </div>
  );
}
