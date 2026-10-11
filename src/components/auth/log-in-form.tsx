"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { logIn } from "@/lib/auth/actions";

export function LogInForm({ defaultEmail }: { defaultEmail?: string }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(logIn);

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormMessage message={errorMessage(state.error)} />
        <Field
          id="email"
          label={t("login.email")}
          error={errorMessage(state.fieldErrors?.email)}
        >
          {(describedBy, invalid) => (
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username email"
              inputMode="email"
              required
              defaultValue={defaultEmail}
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
          )}
        </Field>
        <PasswordField
          id="password"
          name="password"
          label={t("login.password")}
          autoComplete="current-password"
        />
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-semibold underline underline-offset-4"
        >
          {t("login.forgot")}
        </Link>
        <SubmitButton pending={pending}>{t("login.submit")}</SubmitButton>
      </form>
      <p className="text-center text-sm text-muted">{t("common.or")}</p>
      <ButtonLink href="/login/code" variant="secondary" block>
        {t("login.emailCode")}
      </ButtonLink>
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
        {t("common.googleLater")}
      </p>
      <p className="text-center text-sm">
        {t("login.newHere")}{" "}
        <Link
          href="/signup"
          className="font-semibold underline underline-offset-4"
        >
          {t("login.createAccount")}
        </Link>
      </p>
    </div>
  );
}
