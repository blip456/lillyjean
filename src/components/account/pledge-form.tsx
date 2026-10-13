"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { savePledge } from "@/lib/account/actions";
import { PLEDGE_MAX, PLEDGE_MIN } from "@/lib/validation";

import { stepGoal } from "./pledge-goal";

type PledgeFormProps = {
  context: "onboarding" | "settings";
  initialGoal: number | null;
  submitLabel: string;
};

/** Yearly pledge in books, with "No goal, just reading" as an equal choice (P29, A11). */
export function PledgeForm({
  context,
  initialGoal,
  submitLabel,
}: PledgeFormProps) {
  const t = useTranslations("onboarding.pledge");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(savePledge);
  // Text, not a number: an emptied field stays empty while typing (see stepGoal).
  const [goal, setGoal] = useState(String(initialGoal ?? 12));

  const step = (delta: number) => setGoal((value) => stepGoal(value, delta));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="context" value={context} />
      <FormMessage message={errorMessage(state.error)} />
      <Field
        id="goal"
        label={t("goal")}
        hint={t("changeLater")}
        error={errorMessage(state.fieldErrors?.goal)}
      >
        {(describedBy, invalid) => (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => step(-1)}
              aria-label={t("decrease")}
            >
              −
            </Button>
            <input
              id="goal"
              name="goal"
              type="number"
              inputMode="numeric"
              min={PLEDGE_MIN}
              max={PLEDGE_MAX}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={`${inputClass} text-center font-serif text-3xl font-semibold`}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => step(1)}
              aria-label={t("increase")}
            >
              +
            </Button>
          </div>
        )}
      </Field>
      <SubmitButton pending={pending} name="intent" value="goal">
        {submitLabel}
      </SubmitButton>
      <div className="space-y-1 text-center">
        <SubmitButton
          pending={pending}
          name="intent"
          value="no-goal"
          variant="secondary"
        >
          {t("noGoal")}
        </SubmitButton>
        <p className="text-sm text-muted">{t("noGoalHint")}</p>
      </div>
    </form>
  );
}
