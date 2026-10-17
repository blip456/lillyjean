import { useFormatter, useTranslations } from "next-intl";

import { BookCover } from "@/components/books/book-cover";
import { Link } from "@/components/ui/link";
import { appToday, whenLabel } from "@/lib/challenges/dates";
import { challengeHref } from "@/lib/challenges/links";
import type { ChallengeSummary } from "@/lib/challenges/types";

type ChallengeCardProps = {
  challenge: ChallengeSummary;
  /** "YYYY-MM-DD"; defaults to today in the app's time zone. */
  today?: string;
};

/**
 * A challenge as a card (E1 Active, E3 Past, Home B1): kind and timing, title, and my pick with
 * its status, or "No book picked yet". Completed challenges show the date and a DONE stamp.
 * The whole card opens the challenge (E4).
 */
export function ChallengeCard({ challenge, today }: ChallengeCardProps) {
  const t = useTranslations("challenges");
  const tBooks = useTranslations("books");
  const format = useFormatter();
  const completed = challenge.state === "completed";
  const when = whenLabel(challenge, today ?? appToday());
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

  return (
    <Link
      href={challengeHref(challenge.id)}
      className="relative block rounded-2xl border border-border bg-surface p-4 focus-visible:outline-offset-4"
    >
      <span className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="rounded-full border border-border px-2 py-0.5 font-semibold tracking-wide uppercase">
          {t(`kind.${challenge.kind}`)}
        </span>
        <span>
          {completed && challenge.completedOn
            ? t("completedOn", { date: date(challenge.completedOn) })
            : t(`when.${when.key}`, { count: when.days })}
        </span>
      </span>
      <span className="mt-2 block font-serif text-lg leading-snug font-semibold break-words">
        {challenge.title}
      </span>
      {challenge.pick ? (
        <span className="mt-3 flex items-center gap-3">
          <BookCover
            title={challenge.pick.title}
            coverUrl={challenge.pick.coverUrl}
            size="sm"
          />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate">
              {completed
                ? t("youRead", { title: challenge.pick.title })
                : t("yourPick", { title: challenge.pick.title })}
            </span>
            {!completed && challenge.pick.status && (
              <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                {tBooks(`status.${challenge.pick.status}`)}
              </span>
            )}
          </span>
        </span>
      ) : (
        <span className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{t("noPick")}</span>
          <span className="font-semibold underline underline-offset-4">
            {t("choose")}
          </span>
        </span>
      )}
      {completed && (
        <span
          aria-hidden="true"
          className="absolute right-4 bottom-4 -rotate-12 rounded-md border-2 border-foreground px-2 py-0.5 text-xs font-bold tracking-widest"
        >
          {t("doneStamp")}
        </span>
      )}
    </Link>
  );
}
