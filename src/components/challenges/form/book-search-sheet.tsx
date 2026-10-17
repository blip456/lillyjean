"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { CheckIcon } from "@/components/navigation/icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Sheet } from "@/components/ui/sheet";
import { useErrorMessage } from "@/components/use-error-message";
import { searchBooksAction } from "@/lib/books/actions";
import type { BookListItem } from "@/lib/books/types";
import { SEARCH_MIN_LENGTH } from "@/lib/books/validation";
import { MIN_CANDIDATES } from "@/lib/challenges/validation";

const DEBOUNCE_MS = 300;

type Search =
  | { state: "idle" }
  | { state: "searching"; results: BookListItem[] }
  | { state: "done"; results: BookListItem[] }
  | { state: "error"; error: string };

type BookSearchSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Ids of the books on the candidate list: those results show as added. */
  chosenIds: ReadonlySet<string>;
  onToggle: (book: BookListItem) => void;
};

/**
 * "+ Add books" in the challenge form (E6, E8): the book search (same search as A10 and D1) in a
 * sheet. A tap adds a result to the candidates, a second tap takes it off again; the counter shows
 * how far the list is. Done closes the sheet.
 */
export function BookSearchSheet({
  open,
  onClose,
  chosenIds,
  onToggle,
}: BookSearchSheetProps) {
  const t = useTranslations("challengeForm.search");

  return (
    <Sheet open={open} onClose={onClose} title={t("title")}>
      {/* Mounted per opening, so every opening starts with an empty search. */}
      {open && (
        <SearchBody
          chosenIds={chosenIds}
          onToggle={onToggle}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

function SearchBody({
  chosenIds,
  onToggle,
  onDone,
}: {
  chosenIds: ReadonlySet<string>;
  onToggle: (book: BookListItem) => void;
  onDone: () => void;
}) {
  const t = useTranslations("challengeForm");
  const tBooks = useTranslations("books");
  const errorMessage = useErrorMessage();
  const id = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    const text = value.trim();
    const request = ++latest.current;
    if (text.length < SEARCH_MIN_LENGTH) {
      setSearch({ state: "idle" });
      return;
    }
    setSearch((current) => ({
      state: "searching",
      results: "results" in current ? current.results : [],
    }));
    timer.current = setTimeout(async () => {
      let result: Awaited<ReturnType<typeof searchBooksAction>>;
      try {
        result = await searchBooksAction(text);
      } catch (error) {
        console.error(error);
        result = { ok: false, error: "unknown" };
      }
      if (request !== latest.current) return;
      setSearch(
        result.ok
          ? { state: "done", results: result.data }
          : { state: "error", error: result.error },
      );
    }, DEBOUNCE_MS);
  };

  const results = "results" in search ? search.results : [];

  return (
    <div className="space-y-4">
      <Field id={`${id}-q`} label={t("search.label")} hint={t("search.hint")}>
        {(describedBy) => (
          <Input
            id={`${id}-q`}
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              // Search closes the keyboard instead of submitting anything.
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            aria-describedby={describedBy}
            aria-controls={`${id}-results`}
          />
        )}
      </Field>

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p role="status" aria-live="polite">
          {search.state === "searching" && t("search.searching")}
          {search.state === "done" &&
            t("search.resultCount", { count: search.results.length })}
        </p>
        <p aria-hidden="true" className="font-semibold tabular-nums">
          {t("counter", { count: chosenIds.size, min: MIN_CANDIDATES })}
        </p>
      </div>
      {search.state === "error" && (
        <FormMessage message={errorMessage(search.error)} />
      )}

      <ul
        id={`${id}-results`}
        aria-label={t("search.title")}
        className="max-h-[45dvh] divide-y divide-border overflow-y-auto"
      >
        {results.map((book) => {
          const added = chosenIds.has(book.id);
          return (
            <li key={book.id}>
              <button
                type="button"
                aria-pressed={added}
                onClick={() => onToggle(book)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left"
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
                    {book.authors.join(", ") || tBooks("unknownAuthor")}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-semibold ${
                    added
                      ? "border-foreground bg-foreground text-background"
                      : "border-border"
                  }`}
                >
                  {added && <CheckIcon width={14} height={14} />}
                  {added ? t("search.added") : t("search.add")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Button block onClick={onDone}>
        {t("search.done")}
      </Button>
    </div>
  );
}
