"use client";

import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { setNewPassword } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(setNewPassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <PasswordField
        id="password"
        name="password"
        label={t("password")}
        hint={t("passwordHint")}
        error={errorMessage(state.fieldErrors?.password)}
        autoComplete="new-password"
      />
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}
