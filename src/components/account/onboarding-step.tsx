import { useTranslations } from "next-intl";

import { ONBOARDING_STEPS } from "@/lib/onboarding";

/** "2 of 3" with a small progress bar, at the top of every onboarding step (A9–A11). */
export function OnboardingStep({ step }: { step: number }) {
  const t = useTranslations("common");

  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: ONBOARDING_STEPS }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 w-6 rounded-full ${index < step ? "bg-foreground" : "bg-border"}`}
          />
        ))}
      </span>
      <span className="text-sm font-semibold text-muted">
        {t("stepOf", { step, total: ONBOARDING_STEPS })}
      </span>
    </span>
  );
}
