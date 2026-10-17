"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { Button, ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet } from "@/components/ui/sheet";
import type { BookListItem } from "@/lib/books/types";
import { ownPickHref } from "@/lib/challenges/links";
import type { ChallengeSummary } from "@/lib/challenges/types";

import {
  candidatePreview,
  ownPickFromChallengeHref,
  pickAction,
} from "./challenge-view";
import { usePick } from "./use-pick";

const sectionTitle = "font-semibold";

type ChallengePicksProps = {
  challengeId: string;
  pick: ChallengeSummary["pick"];
  candidates: BookListItem[];
  /** Completed challenges are read-only: no Change, Add this book or own pick. */
  readOnly: boolean;
  /** "Completed 12 March · You read …", shown instead of the pick block when read-only. */
  completedLine?: string;
};

/**
 * My pick and the candidate books on a challenge (E4). "Add this book" makes a candidate my
 * pick; replacing an earlier pick asks first. Four candidates show, then "+ n more · Show all".
 * "Change" opens the full list. "Submit my own pick" goes to E5 (P11).
 */
export function ChallengePicks({
  challengeId,
  pick,
  candidates,
  readOnly,
  completedLine,
}: ChallengePicksProps) {
  const t = useTranslations("challengeScreens");
  const tBooks = useTranslations("books");
  const tCard = useTranslations("challenges");
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [replacing, setReplacing] = useState<BookListItem | null>(null);
  const candidatesHeading = useRef<HTMLHeadingElement>(null);
  const { pick: choose, pending } = usePick(challengeId);
  const pickId = pick?.id ?? null;
  const { shown, hidden } = candidatePreview(candidates, pickId, expanded);
  const authorsOf = (book: BookListItem) =>
    book.authors.join(", ") || tBooks("unknownAuthor");

  const add = (book: BookListItem) => {
    if (pickAction(book.id, pickId) === "replace") setReplacing(book);
    else choose(book);
  };

  const openCandidates = () => {
    setExpanded(true);
    candidatesHeading.current?.scrollIntoView({ block: "start" });
    candidatesHeading.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <section aria-labelledby={`${id}-pick`} className="space-y-3">
        <h2 id={`${id}-pick`} className={sectionTitle}>
          {t("yourPick")}
        </h2>
        {readOnly && completedLine ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            {pick && (
              <BookCover
                title={pick.title}
                coverUrl={pick.coverUrl}
                size="sm"
              />
            )}
            <p className="min-w-0 flex-1 font-semibold">{completedLine}</p>
            <span
              aria-hidden="true"
              className="shrink-0 -rotate-12 rounded-md border-2 border-foreground px-2 py-0.5 text-xs font-bold tracking-widest"
            >
              {tCard("doneStamp")}
            </span>
          </div>
        ) : pick ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <Link
              href={`/books/${pick.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
            >
              <BookCover
                title={pick.title}
                coverUrl={pick.coverUrl}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {pick.title}
                </span>
                <span className="block truncate text-sm text-muted">
                  {authorsOf(pick)}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {pick.status && (
                    <span className="rounded-full border border-border px-2 py-0.5 font-semibold">
                      {tBooks(`status.${pick.status}`)}
                    </span>
                  )}
                  {pick.isOwnPick && (
                    <span className="px-0.5 py-0.5 text-muted">
                      {t("ownPick")}
                    </span>
                  )}
                </span>
              </span>
            </Link>
            {!readOnly && (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 px-4 text-sm"
                onClick={openCandidates}
              >
                {t("change")}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4">
            <p className="font-semibold">{t("noPick")}</p>
            {!readOnly && (
              <p className="text-sm text-muted">{t("noPickHint")}</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby={`${id}-candidates`} className="space-y-2">
        <h2
          ref={candidatesHeading}
          id={`${id}-candidates`}
          tabIndex={-1}
          className={`${sectionTitle} scroll-mt-4`}
        >
          {t("candidates", { count: candidates.length })}
        </h2>
        <ul className="divide-y divide-border" aria-busy={pending}>
          {shown.map((book) => {
            const isPick = book.id === pickId;
            return (
              <li key={book.id} className="flex items-center gap-3 py-2">
                <Link
                  href={`/books/${book.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
                >
                  <BookCover
                    title={book.title}
                    coverUrl={book.coverUrl}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {book.title}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {authorsOf(book)}
                    </span>
                  </span>
                </Link>
                {isPick ? (
                  <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    {t("isYourPick")}
                  </span>
                ) : (
                  !readOnly && (
                    <button
                      type="button"
                      disabled={pending}
                      aria-haspopup={pickId ? "dialog" : undefined}
                      aria-label={t("addThisBookLabel", { title: book.title })}
                      onClick={() => add(book)}
                      className="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs font-semibold disabled:opacity-50"
                    >
                      {t("addThisBook")}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            {t("showAll", { count: hidden })}
          </button>
        )}
      </section>

      {!readOnly && (
        <ButtonLink
          href={ownPickFromChallengeHref(ownPickHref(challengeId))}
          variant="secondary"
          block
        >
          {t("submitOwnPick")}
        </ButtonLink>
      )}

      <Sheet
        open={replacing !== null}
        onClose={() => setReplacing(null)}
        title={t("confirmReplace.title")}
      >
        {replacing && pick && (
          <ReplaceConfirm
            text={t("confirmReplace.text", {
              title: replacing.title,
              current: pick.title,
            })}
            confirmLabel={t("confirmReplace.confirm")}
            cancelLabel={t("confirmReplace.cancel")}
            pending={pending}
            onConfirm={() => {
              const book = replacing;
              setReplacing(null);
              choose(book);
            }}
            onCancel={() => setReplacing(null)}
          />
        )}
      </Sheet>
    </>
  );
}

function ReplaceConfirm({
  text,
  confirmLabel,
  cancelLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-5">
      <p>{text}</p>
      <div className="grid gap-3">
        <Button type="button" block disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button type="button" variant="secondary" block onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
