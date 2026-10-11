"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

import { Field, inputClass } from "@/components/ui/field";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  autoComplete: "new-password" | "current-password";
};

/** Password input with a show/hide toggle instead of a confirm field (A5). Paste is allowed. */
export function PasswordField({
  id,
  name,
  label,
  hint,
  error,
  autoComplete,
}: PasswordFieldProps) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      {(describedBy, invalid) => (
        <div className="relative">
          <input
            id={id}
            name={name}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            required
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`${inputClass} pr-20`}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 min-w-16 px-3 text-sm font-semibold underline-offset-4 hover:underline"
          >
            {visible ? t("hide") : t("show")}
          </button>
        </div>
      )}
    </Field>
  );
}
