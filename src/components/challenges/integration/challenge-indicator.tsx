import { useTranslations } from "next-intl";

import type { ChallengeIndicator } from "./indicator";

/**
 * The small challenge line on a book (P25): "Part of 1 challenge" when it is my pick,
 * "Candidate in 2 challenges" when it only fits. The flag is decorative.
 */
export function ChallengeIndicatorLine({
  indicator,
  className,
}: {
  indicator: ChallengeIndicator;
  className?: string;
}) {
  const t = useTranslations("challengeHints");
  return (
    <span
      data-challenge-indicator={indicator.kind}
      className={`flex items-center gap-1 text-xs font-semibold ${className ?? ""}`}
    >
      <span aria-hidden="true">⚑</span>
      <span>
        {indicator.kind === "pick"
          ? t("partOf", { count: indicator.count })
          : t("candidateIn", { count: indicator.count })}
      </span>
    </span>
  );
}
