"use client";

import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  sendFeedback,
} from "@/lib/account/actions";
import { FEEDBACK_MAX_LENGTH } from "@/lib/validation";

export function ChangeEmailForm({ current }: { current: string }) {
  const t = useTranslations("changeEmail");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(changeEmail);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-sm">
        <span className="font-semibold">{t("current")}:</span> {current}
      </p>
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="email"
        label={t("new")}
        hint={t("intro")}
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
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(changePassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <PasswordField
        id="current"
        name="current"
        label={t("changePassword.current")}
        error={errorMessage(state.fieldErrors?.current)}
        autoComplete="current-password"
      />
      <PasswordField
        id="password"
        name="password"
        label={t("changePassword.new")}
        hint={t("changePassword.newHint")}
        error={errorMessage(state.fieldErrors?.password)}
        autoComplete="new-password"
      />
      <SubmitButton pending={pending}>{t("common.save")}</SubmitButton>
    </form>
  );
}

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(sendFeedback);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="message"
        label={t("message")}
        hint={t("messageHint")}
        error={errorMessage(state.fieldErrors?.message)}
      >
        {(describedBy, invalid) => (
          <textarea
            id="message"
            name="message"
            rows={7}
            required
            maxLength={FEEDBACK_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`${inputClass} py-3`}
          />
        )}
      </Field>
      <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const t = useTranslations("deleteAccount");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(deleteAccount);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <PasswordField
        id="password"
        name="password"
        label={t("password")}
        hint={t("passwordHint")}
        error={errorMessage(state.fieldErrors?.password)}
        autoComplete="current-password"
      />
      <SubmitButton pending={pending} variant="danger">
        {t("submit")}
      </SubmitButton>
      <ButtonLink href="/settings" variant="secondary" block>
        {t("keep")}
      </ButtonLink>
    </form>
  );
}
