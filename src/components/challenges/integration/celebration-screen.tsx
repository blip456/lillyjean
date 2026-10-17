"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { NEW_CHALLENGE_PATH } from "@/lib/challenges/links";

import { completedChallengeCount } from "./actions";
import { type CelebrationMoment, otherChallenges } from "./celebration-queue";

/** Time between two stamps when one read completes several challenges (P10). */
const STAMP_INTERVAL_MS = 500;
const STAMP_DURATION_MS = 450;

type CelebrationScreenProps = {
  moment: CelebrationMoment;
  /** Another celebration waits behind this one. */
  hasNext: boolean;
  /** Done or Escape: the next moment, or close. */
  onDone: () => void;
  /** Leaving for another screen: close everything. */
  onClose: () => void;
};

/**
 * E7 Completion celebration: a full-screen dialog over everything, including the tab bar.
 * "CHALLENGE COMPLETED" stamps land one after the other (a short animation, none with reduced
 * motion; a short vibration where the device has one), then the challenge, the book, the new
 * counter (a plain number, P33: no sharing) and the other challenges the same read completed.
 * Focus starts on Done; Escape is Done; afterwards focus goes back to where it was.
 */
export function CelebrationScreen({
  moment,
  hasNext,
  onDone,
  onClose,
}: CelebrationScreenProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const bookId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      restoreFocus(previous);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      aria-describedby={bookId}
      onCancel={(event) => {
        // Escape: the same as Done, so a queued celebration is not skipped silently.
        event.preventDefault();
        onDone();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-background p-0 text-foreground backdrop:bg-background"
    >
      <CelebrationContent
        key={moment.key}
        moment={moment}
        headingId={headingId}
        bookId={bookId}
        hasNext={hasNext}
        onDone={onDone}
        onClose={onClose}
      />
    </dialog>
  );
}

/** Back to the element that had focus; when it is gone (its row left the list), the page title. */
function restoreFocus(previous: HTMLElement | null) {
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus();
}

function CelebrationContent({
  moment,
  headingId,
  bookId,
  hasNext,
  onDone,
  onClose,
}: Omit<CelebrationScreenProps, "moment"> & {
  moment: CelebrationMoment;
  headingId: string;
  bookId: string;
}) {
  const t = useTranslations("celebration");
  const [count, setCount] = useState<number | null>(null);
  const stamps = useRef<(HTMLSpanElement | null)[]>([]);
  const done = useRef<HTMLButtonElement>(null);
  const [headline] = moment.challenges;
  const others = otherChallenges(moment);

  useEffect(() => {
    done.current?.focus();
    let active = true;
    // The counter after the change: the read or pick is saved before the celebration starts.
    completedChallengeCount().then(
      (value) => active && setCount(value),
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const animations = stamps.current.flatMap((stamp, index) => {
      const delay = index * STAMP_INTERVAL_MS;
      if (typeof navigator.vibrate === "function")
        timers.push(
          setTimeout(
            () => navigator.vibrate(35),
            delay + (reduce ? 0 : STAMP_DURATION_MS * 0.7),
          ),
        );
      if (reduce || !stamp?.animate) return [];
      return [
        stamp.animate(
          [
            { transform: "scale(2.4)", opacity: 0 },
            { transform: "scale(0.94)", opacity: 1, offset: 0.7 },
            { transform: "scale(1)", opacity: 1 },
          ],
          {
            duration: STAMP_DURATION_MS,
            delay,
            easing: "cubic-bezier(0.2, 0.8, 0.3, 1)",
            fill: "both",
          },
        ),
      ];
    });
    return () => {
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-xl">
      <div
        aria-hidden="true"
        className="relative mx-auto mt-6 flex h-48 w-full items-center justify-center"
      >
        {moment.challenges.map((challenge, index) => (
          <span
            key={challenge.id}
            className="absolute"
            style={{
              translate: `${index * 14}px ${index * 12}px`,
              rotate: `${-12 + index * 7}deg`,
            }}
          >
            <span
              ref={(element) => {
                stamps.current[index] = element;
              }}
              className="block rounded-xl border-4 border-double border-accent bg-background px-4 py-2 text-center font-serif text-xl leading-tight font-bold tracking-[0.12em] text-accent uppercase"
            >
              {t("stamp")}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-8 flex-1 space-y-3 text-center">
        <h2 id={headingId} className="font-serif text-3xl font-semibold">
          {t("heading")}
        </h2>
        <p className="font-serif text-xl break-words">{headline.title}</p>
        <p id={bookId}>{t("youRead", { title: moment.bookTitle })}</p>
        <p className="min-h-6 font-semibold" aria-live="polite">
          {count !== null && t("count", { count })}
        </p>
        {others.length > 0 && (
          <div className="mx-auto max-w-sm space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">
              {t("alsoCompleted", { count: others.length })}
            </p>
            <ul className="space-y-1">
              {others.map((challenge) => (
                <li key={challenge.id} className="break-words">
                  {challenge.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <Button ref={done} type="button" block onClick={onDone}>
          {t("done")}
        </Button>
        {!hasNext && (
          <ButtonLink
            href={NEW_CHALLENGE_PATH}
            variant="secondary"
            block
            onClick={onClose}
          >
            {t("findNew")}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
