"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Link } from "@/components/ui/link";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { resendCode, verifyCode } from "@/lib/auth/actions";
import type { CodeFlow } from "@/lib/validation";

const RESEND_COOLDOWN_SECONDS = 60;

type VerifyFormProps = { flow: CodeFlow; email: string; editHref: string };

/** Shared 6-digit code screen for sign-up, code login, password reset and email change (A4, A7). */
export function VerifyForm({ flow, email, editHref }: VerifyFormProps) {
  const t = useTranslations("verify");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(verifyCode);
  const {
    state: resendState,
    onSubmit: onResend,
    pending: resending,
  } = useFormAction(resendCode);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  // Restart the cooldown whenever a new code was sent.
  const sentAt = resendState.sentAt;
  useEffect(() => {
    const start = sentAt ?? Date.now();
    const tick = () =>
      setSecondsLeft(
        Math.max(
          0,
          RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - start) / 1000),
        ),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  return (
    <div className="space-y-6">
      <p>
        {t(flow === "email_change" ? "sentToEmailChange" : "sentTo", { email })}{" "}
        <Link
          href={editHref}
          className="font-semibold whitespace-nowrap underline underline-offset-4"
        >
          {t("editEmail")}
        </Link>
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <input type="hidden" name="flow" value={flow} />
        <input type="hidden" name="email" value={email} />
        <FormMessage message={errorMessage(state.error)} />
        <Field
          id="code"
          label={t("code")}
          hint={t("codeHint")}
          error={errorMessage(state.fieldErrors?.code)}
        >
          {(describedBy, invalid) => (
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              required
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
              onChange={(event) => {
                // Submit automatically on the sixth digit (A4); paste and autofill work too.
                if (event.currentTarget.value.replace(/\D/g, "").length === 6) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          )}
        </Field>
        <SubmitButton pending={pending}>
          {t(flow === "recovery" ? "submitRecovery" : "submit")}
        </SubmitButton>
      </form>

      <form onSubmit={onResend} className="space-y-3">
        <input type="hidden" name="flow" value={flow} />
        <input type="hidden" name="email" value={email} />
        <FormMessage
          tone={resendState.error ? "error" : "success"}
          message={
            resendState.error
              ? errorMessage(resendState.error)
              : resendState.message
                ? t("resent")
                : undefined
          }
        />
        <Button
          type="submit"
          variant="secondary"
          block
          disabled={secondsLeft > 0 || resending}
        >
          {secondsLeft > 0
            ? t("resendIn", { seconds: secondsLeft })
            : t("resend")}
        </Button>
      </form>
    </div>
  );
}
