"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { saveUsername } from "@/lib/account/actions";
import { createClient } from "@/lib/supabase/client";
import { USERNAME_PATTERN } from "@/lib/validation";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

type UsernameFormProps = {
  context: "onboarding" | "settings";
  label: string;
  submitLabel: string;
  current?: string | null;
  disabled?: boolean;
  /** Renders a live preview (the library card in onboarding). */
  preview?: (username: string) => ReactNode;
};

/** Username input with the rules as hint and a live availability check (A6, A9, G6). */
export function UsernameForm({
  context,
  label,
  submitLabel,
  current,
  disabled,
  preview,
}: UsernameFormProps) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(saveUsername);
  const [value, setValue] = useState("");
  // Last answer from the database, kept with the name it belongs to.
  const [checked, setChecked] = useState<{
    name: string;
    available: boolean | null;
  } | null>(null);

  const normalized = value.trim().toLowerCase();
  const needsCheck =
    Boolean(normalized) &&
    normalized !== current &&
    USERNAME_PATTERN.test(normalized);

  const availability: Availability =
    !normalized || normalized === current
      ? "idle"
      : !USERNAME_PATTERN.test(normalized)
        ? "invalid"
        : checked?.name !== normalized
          ? "checking"
          : checked.available === null
            ? "idle"
            : checked.available
              ? "available"
              : "taken";

  useEffect(() => {
    if (!needsCheck) return;
    const timer = setTimeout(async () => {
      const { data, error } = await createClient().rpc("username_available", {
        name: normalized,
      });
      setChecked({ name: normalized, available: error ? null : Boolean(data) });
    }, 400);
    return () => clearTimeout(timer);
  }, [normalized, needsCheck]);

  const status =
    availability === "available"
      ? t("common.available")
      : availability === "taken"
        ? t("common.taken")
        : availability === "checking"
          ? t("common.checking")
          : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="context" value={context} />
      {preview?.(normalized)}
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="username"
        label={label}
        hint={t("onboarding.libraryCard.usernameHint")}
        error={errorMessage(state.fieldErrors?.username)}
      >
        {(describedBy, invalid) => (
          <div className="relative">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              required
              disabled={disabled}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-describedby={
                describedBy
                  ? `${describedBy} username-status`
                  : "username-status"
              }
              aria-invalid={invalid || availability === "taken"}
              className="pr-28"
            />
            <span
              id="username-status"
              aria-live="polite"
              className={`absolute inset-y-0 right-4 flex items-center text-sm font-semibold ${
                availability === "available"
                  ? "text-success"
                  : availability === "taken"
                    ? "text-danger"
                    : "text-muted"
              }`}
            >
              {availability === "available" && "✓ "}
              {status}
            </span>
          </div>
        )}
      </Field>
      <SubmitButton
        pending={pending}
        disabled={
          disabled || availability === "taken" || availability === "invalid"
        }
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
