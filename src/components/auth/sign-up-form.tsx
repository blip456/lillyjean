"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { signUp } from "@/lib/auth/actions";

export function SignUpForm({ defaultEmail }: { defaultEmail?: string }) {
  const t = useTranslations("signup");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(signUp);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="email"
        label={t("email")}
        error={errorMessage(state.fieldErrors?.email)}
      >
        {(describedBy, invalid) => (
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
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
        label={t("password")}
        hint={t("passwordHint")}
        error={errorMessage(state.fieldErrors?.password)}
        autoComplete="new-password"
      />
      <p className="text-sm text-muted">{t("terms")}</p>
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
      <p className="text-center text-sm">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="font-semibold underline underline-offset-4"
        >
          {t("logIn")}
        </Link>
      </p>
    </form>
  );
}
