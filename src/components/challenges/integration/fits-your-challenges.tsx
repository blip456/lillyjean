"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useCelebrate } from "@/components/challenges/celebration";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet } from "@/components/ui/sheet";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { pickChallengeBook } from "@/lib/challenges/actions";
import { whenLabel } from "@/lib/challenges/dates";
import { challengeHref } from "@/lib/challenges/links";
import type { BookChallenge } from "@/lib/challenges/types";

type FitsYourChallengesProps = {
  book: { id: string; title: string };
  challenges: BookChallenge[];
  /** YYYY-MM-DD in the app's time zone, for "Ends in 12 days". */
  today: string;
};

/**
 * "Fits your challenges" on the book page (D2, S5): my open challenges where this book is a
 * candidate or my pick. Each card shows the kind, the timing and the title (→ E4), and either
 * "Your pick" or "Add this book", which makes it my pick; replacing another pick asks first.
 * A book already read inside the window completes the challenge at once, with the celebration
 * (P51).
 */
export function FitsYourChallenges({
  book,
  challenges,
  today,
}: FitsYourChallengesProps) {
  const t = useTranslations("challengeHints");
  const tCard = useTranslations("challenges");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const celebrate = useCelebrate();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BookChallenge | null>(null);
  // The sheet stays mounted after the first use, so closing it returns focus to the button.
  const [confirmUsed, setConfirmUsed] = useState(false);

  const pick = (challenge: BookChallenge) => {
    setPendingId(challenge.id);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof pickChallengeBook>>;
      try {
        result = await pickChallengeBook(challenge.id, book.id);
      } catch (error) {
        console.error(error);
        result = { ok: false, error: "unknown" };
      }
      setPendingId(null);
      if (!result.ok) {
        showSnackbar({ message: errorMessage(result.error) ?? "" });
        return;
      }
      if (result.data.completed) celebrate([result.data.completed]);
      else showSnackbar({ message: t("picked", { title: book.title }) });
    });
  };

  return (
    <>
      <ul className="space-y-3">
        {challenges.map((challenge) => {
          const when = whenLabel(challenge, today);
          return (
            <li
              key={challenge.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <p className="flex items-center justify-between gap-3 text-xs text-muted">
                <span className="rounded-full border border-border px-2 py-0.5 font-semibold tracking-wide uppercase">
                  {tCard(`kind.${challenge.kind}`)}
                </span>
                <span>{tCard(`when.${when.key}`, { count: when.days })}</span>
              </p>
              <Link
                href={challengeHref(challenge.id)}
                className="mt-2 block font-serif text-lg leading-snug font-semibold break-words underline-offset-4 hover:underline"
              >
                {challenge.title}
              </Link>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                {challenge.isPick ? (
                  <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    {t("yourPickBadge")}
                  </span>
                ) : (
                  <>
                    <span className="min-w-0 truncate text-muted">
                      {challenge.otherPickTitle
                        ? tCard("yourPick", {
                            title: challenge.otherPickTitle,
                          })
                        : tCard("noPick")}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 px-4 text-sm"
                      aria-label={t("addThisBookLabel", {
                        title: challenge.title,
                      })}
                      aria-haspopup={
                        challenge.otherPickTitle ? "dialog" : undefined
                      }
                      aria-busy={pending && pendingId === challenge.id}
                      disabled={pending}
                      onClick={() => {
                        if (challenge.otherPickTitle) {
                          setConfirmUsed(true);
                          setConfirm(challenge);
                        } else pick(challenge);
                      }}
                    >
                      {t("addThisBook")}
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {confirmUsed && (
        <Sheet
          open={confirm !== null}
          onClose={() => setConfirm(null)}
          title={t("replaceTitle", { title: confirm?.otherPickTitle ?? "" })}
          description={
            confirm &&
            t("replaceText", { book: book.title, challenge: confirm.title })
          }
        >
          <div className="space-y-3">
            <Button
              type="button"
              block
              onClick={() => {
                const challenge = confirm;
                setConfirm(null);
                if (challenge) pick(challenge);
              }}
            >
              {t("replace")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              block
              onClick={() => setConfirm(null)}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
