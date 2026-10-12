"use client";

import { useTranslations } from "next-intl";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { CheckIcon } from "@/components/navigation/icons";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Link } from "@/components/ui/link";
import { useErrorMessage } from "@/components/use-error-message";
import {
  restoreBookStatus,
  searchBooksAction,
  setBookStatus,
} from "@/lib/books/actions";
import type { BookListItem, PreviousBookState } from "@/lib/books/types";
import { SEARCH_MIN_LENGTH } from "@/lib/books/validation";
import { addManuallyHref } from "@/lib/navigation";

const RETURN_TO = "/onboarding/currently-reading";
const NEXT_STEP = "/onboarding/pledge";
const DEBOUNCE_MS = 300;

type Search =
  | { state: "idle" }
  | { state: "searching"; results: BookListItem[] }
  | { state: "done"; results: BookListItem[] }
  | { state: "error"; error: string };

type CurrentlyReadingStepProps = {
  /** Books already Reading: chosen earlier in this step or added by hand. */
  initialChosen: BookListItem[];
  /** A book just added by hand (D3) that is not Reading yet. */
  added: BookListItem | null;
};

function stateOf(book: BookListItem): PreviousBookState {
  return book.status ? { status: book.status, progress: book.progress } : null;
}

/**
 * A10: search (results only after typing; no recommendations) and tap a result to mark it as
 * Reading; tap again to undo. Skip and Continue both go on to the pledge.
 */
export function CurrentlyReadingStep({
  initialChosen,
  added,
}: CurrentlyReadingStepProps) {
  const t = useTranslations("onboarding.currentlyReading");
  const tBooks = useTranslations("books");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const id = useId();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  // Books shown under "Your books". Unticking keeps a book in the list, so focus stays put.
  const [listed, setListed] = useState<BookListItem[]>(() =>
    added ? [added, ...initialChosen] : initialChosen,
  );
  const [chosenIds, setChosenIds] = useState<ReadonlySet<string>>(
    () => new Set(listed.map((book) => book.id)),
  );
  // What each book was before this step, so unticking puts exactly that back.
  const previous = useRef(
    new Map<string, PreviousBookState>([
      ...initialChosen.map((book) => [book.id, null] as const),
      ...(added ? [[added.id, stateOf(added)] as const] : []),
    ]),
  );
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestSearch = useRef(0);

  const setChosen = (bookId: string, chosen: boolean) =>
    setChosenIds((ids) => {
      const next = new Set(ids);
      if (chosen) next.add(bookId);
      else next.delete(bookId);
      return next;
    });

  useEffect(() => () => clearTimeout(timer.current), []);

  // A book added by hand comes back here chosen; make sure it is Reading.
  const addedHandled = useRef(false);
  useEffect(() => {
    if (!added || added.status === "reading" || addedHandled.current) return;
    addedHandled.current = true;
    void setBookStatus(added.id, "reading").then((result) => {
      if (result.ok) return;
      setError(result.error);
      setChosenIds((ids) => new Set([...ids].filter((id) => id !== added.id)));
    });
  }, [added]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    const text = value.trim();
    const request = ++latestSearch.current;
    if (text.length < SEARCH_MIN_LENGTH) {
      setSearch({ state: "idle" });
      return;
    }
    setSearch((current) => ({
      state: "searching",
      results: "results" in current ? current.results : [],
    }));
    timer.current = setTimeout(async () => {
      const result = await searchBooksAction(text);
      if (request !== latestSearch.current) return;
      setSearch(
        result.ok
          ? { state: "done", results: result.data }
          : { state: "error", error: result.error },
      );
    }, DEBOUNCE_MS);
  };

  const toggle = async (book: BookListItem) => {
    if (busy.has(book.id)) return;
    setError(undefined);
    setBusy((ids) => new Set(ids).add(book.id));
    const wasChosen = chosenIds.has(book.id);
    if (!previous.current.has(book.id))
      previous.current.set(book.id, stateOf(book));

    setChosen(book.id, !wasChosen);
    if (!wasChosen)
      setListed((books) =>
        books.some((item) => item.id === book.id) ? books : [book, ...books],
      );
    const result = wasChosen
      ? await restoreBookStatus(book.id, previous.current.get(book.id) ?? null)
      : await setBookStatus(book.id, "reading");
    if (!result.ok) {
      setError(result.error);
      setChosen(book.id, wasChosen);
    }

    setBusy((ids) => {
      const next = new Set(ids);
      next.delete(book.id);
      return next;
    });
  };

  const bookToggle = (book: BookListItem) => {
    const isChosen = chosenIds.has(book.id);
    return (
      <button
        type="button"
        aria-pressed={isChosen}
        aria-busy={busy.has(book.id) || undefined}
        onClick={() => void toggle(book)}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left"
      >
        <BookCover title={book.title} coverUrl={book.coverUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{book.title}</span>
          <span className="block truncate text-sm text-muted">
            {book.authors.join(", ") || tBooks("unknownAuthor")}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border-2 ${
            isChosen
              ? "border-foreground bg-foreground text-background"
              : "border-muted"
          }`}
        >
          {isChosen && <CheckIcon width={18} height={18} />}
        </span>
      </button>
    );
  };

  const results = "results" in search ? search.results : [];
  const pending = busy.size > 0;
  const waitForSaving = (event: MouseEvent) => {
    if (pending) event.preventDefault();
  };

  return (
    <div className="space-y-6">
      <FormMessage message={errorMessage(error)} />

      {listed.length > 0 && (
        <section aria-labelledby={`${id}-chosen`} className="space-y-1">
          <h2
            id={`${id}-chosen`}
            className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
          >
            {t("chosen")}
          </h2>
          <ul className="divide-y divide-border">
            {listed.map((book) => (
              <li key={book.id}>{bookToggle(book)}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <Field id={`${id}-search`} label={t("search")}>
          {(describedBy) => (
            <Input
              id={`${id}-search`}
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              aria-describedby={describedBy}
              aria-controls={`${id}-results`}
            />
          )}
        </Field>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {search.state === "searching" && t("searching")}
          {search.state === "done" &&
            t("resultCount", { count: search.results.length })}
        </p>
        {search.state === "error" && (
          <FormMessage message={errorMessage(search.error)} />
        )}
      </div>

      <section
        id={`${id}-results`}
        aria-labelledby={`${id}-results-title`}
        hidden={search.state === "idle" || search.state === "error"}
        className="space-y-1"
      >
        <h2
          id={`${id}-results-title`}
          className="text-xs font-semibold tracking-[0.2em] text-muted uppercase"
        >
          {t("results")}
        </h2>
        <ul className="divide-y divide-border">
          {results.map((book) => (
            <li key={book.id}>{bookToggle(book)}</li>
          ))}
        </ul>
      </section>

      <p className="text-sm">
        {t("cantFind")}{" "}
        <Link
          href={addManuallyHref(RETURN_TO, query)}
          prefetch={false}
          className="font-semibold underline underline-offset-4"
        >
          {t("addManually")}
        </Link>
      </p>

      <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-background pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ButtonLink
          href={NEXT_STEP}
          variant="secondary"
          aria-disabled={pending || undefined}
          onClick={waitForSaving}
        >
          {t("skip")}
        </ButtonLink>
        <ButtonLink
          href={NEXT_STEP}
          aria-disabled={pending || undefined}
          onClick={waitForSaving}
        >
          {tCommon("continue")}
        </ButtonLink>
      </div>
    </div>
  );
}
