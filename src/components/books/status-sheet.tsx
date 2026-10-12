"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import {
  BOOK_STATUSES,
  type BookListItem,
  type BookStatus,
} from "@/lib/books/types";

import { type BookState, isSameState } from "./status-rules";

export type StatusSheetProps = {
  book: Pick<BookListItem, "title" | "authors">;
  /** The status shown now (optimistic). */
  state: BookState;
  open: boolean;
  onClose: () => void;
  /** Want to read or Reading (with the optional percentage) was saved. */
  onSave: (status: "want_to_read" | "reading", progress: number | null) => void;
  /** Read was chosen: continue in the mark-as-read sheet (D4). */
  onRead: () => void;
  onRemove: () => void;
};

/**
 * Status sheet (B3): the three statuses, the optional percentage while Reading (P16) and
 * "Remove from my books". Opened from a status pill and from "Edit" on the book page; it is the
 * keyboard and screen reader way to do everything a swipe does.
 */
export function StatusSheet({
  book,
  state,
  open,
  onClose,
  ...actions
}: StatusSheetProps) {
  const tBooks = useTranslations("books");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={book.title}
      description={book.authors.join(", ") || tBooks("unknownAuthor")}
    >
      {/* Mounted per opening, so it always starts from the current status. */}
      {open && <StatusForm state={state} onClose={onClose} {...actions} />}
    </Sheet>
  );
}

function StatusForm({
  state,
  onClose,
  onSave,
  onRead,
  onRemove,
}: Omit<StatusSheetProps, "book" | "open">) {
  const t = useTranslations("bookStatus");
  const tBooks = useTranslations("books");
  const id = useId();
  const [status, setStatus] = useState<BookStatus | null>(state.status);
  const [progress, setProgress] = useState<number | null>(state.progress);
  const continuesToRead = status === "read" && state.status !== "read";

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (continuesToRead) return onRead();
        if (
          status === null ||
          status === "read" ||
          isSameState(state, status, progress)
        )
          return onClose();
        onClose();
        onSave(status, status === "reading" ? progress : null);
      }}
    >
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">
          {t("statusLegend")}
        </legend>
        <div className="divide-y divide-border">
          {BOOK_STATUSES.map((option) => (
            <div key={option} className="flex items-center gap-3">
              <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 has-checked:font-semibold">
                <input
                  type="radio"
                  name="status"
                  value={option}
                  checked={status === option}
                  onChange={() => setStatus(option)}
                  aria-describedby={
                    option === "read" ? `${id}-read-hint` : undefined
                  }
                  className="size-5 accent-foreground"
                />
                {tBooks(`status.${option}`)}
              </label>
              {option === "read" && (
                <span id={`${id}-read-hint`} className="text-xs text-muted">
                  {t("readHint")}
                </span>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {status === "reading" && (
        <ProgressField
          id={`${id}-progress`}
          value={progress}
          onChange={setProgress}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        {state.status ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onRemove();
            }}
            className="-ml-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-danger underline underline-offset-4"
          >
            {t("remove")}
          </button>
        ) : (
          <span />
        )}
        <Button type="submit">
          {continuesToRead ? t("continue") : t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Optional percentage (P16): labelled slider with its value, a hint and Clear. */
export function ProgressField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations("bookStatus");
  const valueText =
    value === null
      ? t("progressNotSet")
      : t("progressValue", { progress: value });

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold">
          {t("progressLabel")}
        </label>
        <span
          aria-hidden="true"
          className={`text-sm tabular-nums ${value === null ? "text-muted" : "font-semibold"}`}
        >
          {valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value ?? 0}
        aria-valuetext={valueText}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.target.value))}
        data-unset={value === null}
        className="block h-11 w-full cursor-pointer accent-foreground data-[unset=true]:opacity-50"
      />
      <div className="flex items-center justify-between gap-4">
        <p id={`${id}-hint`} className="text-sm text-muted">
          {t("progressHint")}
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={t("clearProgressLabel")}
          className="-mr-2 min-h-11 rounded-lg px-2 text-sm font-semibold underline underline-offset-4"
        >
          {t("clearProgress")}
        </button>
      </div>
    </div>
  );
}
