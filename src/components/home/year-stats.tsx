import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { type Pace, readingPace } from "@/lib/home/pace";

type YearStatsProps = {
  read: number;
  goal: number | null;
  today: Date;
  /** All challenges I completed (S5), a plain number (P33). */
  challengesCompleted: number;
};

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Progress ring around the count; decorative, the text next to it says the same. */
function Ring({ share }: { share: number }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className="absolute inset-0 size-full -rotate-90"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="36"
        cy="36"
        r={RADIUS}
        fill="none"
        strokeWidth="6"
        className="stroke-border"
      />
      {share > 0 && (
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
          className="stroke-foreground"
        />
      )}
    </svg>
  );
}

/**
 * Stats on Home (B1/B2): books read this year against the pledge, with the pace, and the number
 * of challenges completed (S5).
 */
export async function YearStats({
  read,
  goal,
  today,
  challengesCompleted,
}: YearStatsProps) {
  const t = await getTranslations("home");

  const paceLine = (pace: Pace) =>
    pace.kind === "ahead" || pace.kind === "behind"
      ? t(`pace.${pace.kind}`, { books: pace.books })
      : t(`pace.${pace.kind}`);

  return (
    <section aria-labelledby="this-year" className="space-y-2">
      <h2
        id="this-year"
        className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
      >
        {t("thisYear")}
      </h2>
      <Card>
        <div className="flex items-center gap-5">
          {goal ? (
            <>
              <div className="relative flex size-20 shrink-0 items-center justify-center">
                <Ring share={Math.min(read / goal, 1)} />
                <p className="relative flex flex-col items-center leading-tight">
                  {t.rich("countOfGoal", {
                    count: read,
                    goal,
                    big: (chunks) => (
                      <span className="font-serif text-2xl font-semibold">
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{t("booksReadLabel")}</p>
                <p className="text-sm text-muted">
                  {read === 0
                    ? t("pledgeGoal", { goal })
                    : paceLine(readingPace(read, goal, today))}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="font-serif text-4xl font-semibold">{read}</p>
              <div className="space-y-1">
                <p className="font-semibold">{t("booksReadLabel")}</p>
                <p className="text-sm text-muted">{t("noGoal")}</p>
                <Link
                  href="/settings/pledge"
                  className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
                >
                  {t("pledgeLink")}
                </Link>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 border-t border-dashed border-border pt-3 text-sm font-semibold">
          {t("challengesCompleted", { count: challengesCompleted })}
        </p>
      </Card>
    </section>
  );
}
