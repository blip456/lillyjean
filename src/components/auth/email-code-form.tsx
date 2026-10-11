"use client";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { requestLoginCode, requestPasswordReset } from "@/lib/auth/actions";

const actions = { login: requestLoginCode, recovery: requestPasswordReset };

type EmailCodeFormProps = {
  purpose: keyof typeof actions;
  emailLabel: string;
  submitLabel: string;
  defaultEmail?: string;
};

/** Asks for an email address and sends a 6-digit code (code login and password reset). */
export function EmailCodeForm({
  purpose,
  emailLabel,
  submitLabel,
  defaultEmail,
}: EmailCodeFormProps) {
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(actions[purpose]);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="email"
        label={emailLabel}
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
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}
