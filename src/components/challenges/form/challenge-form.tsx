"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Input, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import type { BookListItem } from "@/lib/books/types";
import { createChallenge, updateChallenge } from "@/lib/challenges/actions";
import {
  CHALLENGE_THEME_MAX,
  CHALLENGE_TITLE_MAX,
  MIN_CANDIDATES,
} from "@/lib/challenges/validation";

import { BookSearchSheet } from "./book-search-sheet";
import {
  type Candidate,
  candidateRows,
  type CandidatesState,
  hasEnoughCandidates,
  importCandidates,
  initialCandidates,
  removeCandidate,
  toggleCandidate,
  undoRemovePick,
} from "./candidates";
import { ImportReadlistSheet } from "./import-readlist-sheet";

export type ChallengeFormProps =
  | {
      mode: "create";
      /** Prefilled start date (YYYY-MM-DD): today. */
      defaultStartsOn: string;
    }
  | {
      mode: "edit";
      challenge: {
        id: string;
        title: string;
        theme: string | null;
        startsOn: string;
        endsOn: string | null;
        /** Started: title and theme are locked (P49). */
        started: boolean;
        candidates: Candidate[];
        /** My pick when it is one of the candidates. */
        pickId: string | null;
      };
    };

type Sheet = "search" | "import" | null;

/**
 * E6 Create challenge and E8 Edit challenge: title, theme, dates and at least 5 candidate books
 * (P12) with a live counter. Books come from the search ("+ Add books") or a whole readlist at
 * once. After the start (E8) the title and theme are locked and shown read-only; removing my
 * pick keeps it as my pick (P13), with Undo. "Share with" is Sprint 8 and left out.
 */
export function ChallengeForm(props: ChallengeFormProps) {
  const t = useTranslations("challengeForm");
  const tBooks = useTranslations("books");
  const errorMessage = useErrorMessage();
  const id = useId();
  const editing = props.mode === "edit" ? props.challenge : null;
  const locked = editing?.started ?? false;

  const { state, onSubmit, pending } = useFormAction(
    editing ? updateChallenge : createChallenge,
  );
  const errors = state.fieldErrors ?? {};

  const [candidates, setCandidates] = useState<CandidatesState>(() =>
    initialCandidates(editing?.candidates ?? [], editing?.pickId ?? null),
  );
  const [startsOn, setStartsOn] = useState(
    editing?.startsOn ?? (props.mode === "create" ? props.defaultStartsOn : ""),
  );
  const [sheet, setSheet] = useState<Sheet>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<{ index: number } | null>(null);

  const rows = candidateRows(candidates);
  const count = candidates.books.length;
  const enough = hasEnoughCandidates(candidates);
  const chosenIds = new Set(candidates.books.map((book) => book.id));

  // After a remove, focus goes to the row now in that place (or "+ Add books").
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "li > div > button",
      ) ?? [];
    (
      buttons[Math.min(target.index, buttons.length - 1)] ?? addRef.current
    )?.focus();
  }, [candidates]);

  const toggleFromSearch = (book: BookListItem) => {
    const wasAdded = chosenIds.has(book.id);
    setCandidates((current) => toggleCandidate(current, book));
    setAnnouncement(t(wasAdded ? "removed" : "added", { title: book.title }));
  };

  const remove = (book: Candidate, rowIndex: number) => {
    setCandidates((current) => removeCandidate(current, book.id));
    setAnnouncement(t("removed", { title: book.title }));
    focusAfter.current = { index: rowIndex };
  };

  const undo = (book: Candidate) => {
    setCandidates((current) => undoRemovePick(current));
    setAnnouncement(t("added", { title: book.title }));
  };

  const importBooks = (readlist: { name: string }, books: BookListItem[]) => {
    const result = importCandidates(candidates, books);
    setCandidates(result.state);
    setSheet(null);
    setAnnouncement(
      t("import.imported", {
        added: result.added,
        skipped: result.skipped,
        name: readlist.name,
      }),
    );
  };

  const counterId = `${id}-counter`;
  const hintId = `${id}-candidates-hint`;
  const candidatesErrorId = `${id}-candidates-error`;
  const candidatesError = errorMessage(errors.bookIds);

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <FormMessage message={errorMessage(state.error)} />

        {locked && (
          <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            {t("startedNote")}
          </p>
        )}

        {locked && editing ? (
          <>
            <LockedField label={t("title")} lockedLabel={t("locked")}>
              {editing.title}
            </LockedField>
            <input type="hidden" name="title" value={editing.title} />
            <LockedField label={t("theme")} lockedLabel={t("locked")}>
              {editing.theme ?? (
                <span className="text-muted">{t("noTheme")}</span>
              )}
            </LockedField>
            <input type="hidden" name="theme" value={editing.theme ?? ""} />
          </>
        ) : (
          <>
            <Field
              id="title"
              label={t("title")}
              hint={t("required")}
              error={errorMessage(errors.title)}
            >
              {(describedBy, invalid) => (
                <Input
                  id="title"
                  name="title"
                  defaultValue={editing?.title}
                  required
                  maxLength={CHALLENGE_TITLE_MAX}
                  autoComplete="off"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
            <Field
              id="theme"
              label={t("theme")}
              hint={t("themeHint")}
              error={errorMessage(errors.theme)}
            >
              {(describedBy, invalid) => (
                <textarea
                  id="theme"
                  name="theme"
                  rows={3}
                  defaultValue={editing?.theme ?? undefined}
                  maxLength={CHALLENGE_THEME_MAX}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  className={`${inputClass} py-3`}
                />
              )}
            </Field>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="startsOn"
            label={t("startsOn")}
            hint={t("required")}
            error={errorMessage(errors.startsOn)}
          >
            {(describedBy, invalid) => (
              <Input
                id="startsOn"
                name="startsOn"
                type="date"
                required
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Field
            id="endsOn"
            label={t("endsOn")}
            hint={t("optional")}
            error={errorMessage(errors.endsOn)}
          >
            {(describedBy, invalid) => (
              <Input
                id="endsOn"
                name="endsOn"
                type="date"
                defaultValue={editing?.endsOn ?? undefined}
                min={startsOn || undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </div>

        <section aria-labelledby={`${id}-candidates`} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`${id}-candidates`} className="text-sm font-semibold">
              {t("candidates")}
            </h2>
            <p
              id={counterId}
              className={`text-sm font-semibold tabular-nums ${enough ? "" : "text-muted"}`}
            >
              <span aria-hidden="true">
                {t("counter", { count, min: MIN_CANDIDATES })}
              </span>
              <span className="sr-only">
                {t("counterLabel", { count, min: MIN_CANDIDATES })}
              </span>
            </p>
          </div>
          <p id={hintId} className="text-sm text-muted">
            {t("candidatesHint", { min: MIN_CANDIDATES })}
          </p>
          {candidatesError && (
            <p
              id={candidatesErrorId}
              className="text-sm font-medium text-danger"
            >
              {candidatesError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              ref={addRef}
              type="button"
              variant="secondary"
              aria-haspopup="dialog"
              onClick={() => setSheet("search")}
            >
              {t("addBooks")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              aria-haspopup="dialog"
              onClick={() => setSheet("import")}
            >
              {t("importReadlist")}
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted">{t("noCandidates")}</p>
          ) : (
            <ul
              ref={listRef}
              aria-label={t("candidates")}
              className="divide-y divide-border"
            >
              {rows.map(({ book, removed }, index) => (
                <li key={book.id}>
                  <div className="flex min-h-14 items-center gap-3 py-2">
                    <BookCover
                      title={book.title}
                      coverUrl={book.coverUrl}
                      size="sm"
                      className={removed ? "opacity-50" : ""}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-semibold ${removed ? "text-muted line-through" : ""}`}
                      >
                        {book.title}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {removed
                          ? t("removedPick")
                          : book.authors.join(", ") || tBooks("unknownAuthor")}
                      </span>
                    </span>
                    {removed ? (
                      <button
                        type="button"
                        aria-label={t("undoRemove", { title: book.title })}
                        onClick={() => undo(book)}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 font-semibold underline underline-offset-4"
                      >
                        {t("undo")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={t("remove", { title: book.title })}
                        onClick={() => remove(book, index)}
                        className="-mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-xl"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(locked || candidates.removedPick) && (
            <p className="text-sm text-muted">{t("removedNote")}</p>
          )}
          {candidates.books.map((book) => (
            <input key={book.id} type="hidden" name="bookId" value={book.id} />
          ))}
        </section>

        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <SubmitButton
          pending={pending}
          disabled={!enough}
          aria-describedby={
            [counterId, hintId, candidatesError ? candidatesErrorId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {editing ? t("save") : t("create")}
        </SubmitButton>
      </form>

      <BookSearchSheet
        open={sheet === "search"}
        onClose={() => setSheet(null)}
        chosenIds={chosenIds}
        onToggle={toggleFromSearch}
      />
      <ImportReadlistSheet
        open={sheet === "import"}
        onClose={() => setSheet(null)}
        onImport={importBooks}
      />
    </>
  );
}

/** Title or theme after the start (E8): shown, marked Locked, not editable (P49). */
function LockedField({
  label,
  lockedLabel,
  children,
}: {
  label: string;
  lockedLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {label}
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold tracking-wide text-muted uppercase">
          {lockedLabel}
        </span>
      </p>
      <p className="rounded-xl border border-dashed border-border px-4 py-3 break-words">
        {children}
      </p>
    </div>
  );
}
