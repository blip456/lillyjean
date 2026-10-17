"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { CheckIcon } from "@/components/navigation/icons";
import { hasInAppHistory } from "@/components/navigation/in-app-history";
import { Button, ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { searchBooksAction } from "@/lib/books/actions";
import { manualEntryHref } from "@/lib/books/navigation";
import type { BookListItem } from "@/lib/books/types";
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/lib/books/validation";
import { challengeHref, ownPickHref } from "@/lib/challenges/links";

import { ownPickReturnTo } from "./challenge-view";
import { usePick } from "./use-pick";

const DEBOUNCE_MS = 300;

type Search =
  | { state: "idle" }
  | { state: "searching"; results: BookListItem[] }
  | { state: "done"; results: BookListItem[] }
  | { state: "error"; error: string };

type OwnPickFormProps = {
  challengeId: string;
  /** A book just added by hand (D3, `?added=`): listed first and already chosen. */
  added: BookListItem | null;
  /** Opened from the challenge (E4), which is then the previous screen (`?from=challenge`). */
  fromChallenge: boolean;
};

/**
 * E5 Submit my own pick: search the book databases like D1, choose one result and use it as my
 * pick. Own picks are accepted right away (P11). "Add it manually" (D3) comes back here with
 * the new book chosen.
 */
export function OwnPickForm({
  challengeId,
  added,
  fromChallenge,
}: OwnPickFormProps) {
  const t = useTranslations("challengeScreens");
  const tBooks = useTranslations("books");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [chosen, setChosen] = useState<BookListItem | null>(added);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestSearch = useRef(0);
  const { pick, pending } = usePick(challengeId);

  useEffect(() => () => clearTimeout(timer.current), []);

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

  const results = "results" in search ? search.results : [];
  const books = added
    ? [added, ...results.filter((book) => book.id !== added.id)]
    : results;

  let status = "";
  if (search.state === "searching") status = t("searching");
  else if (search.state === "done")
    status = t("results", { count: search.results.length });

  const submit = () => {
    if (!chosen) return;
    pick(chosen, () => {
      // Back to the challenge (E4), which shows the new pick.
      if (fromChallenge && hasInAppHistory()) router.back();
      else router.replace(challengeHref(challengeId));
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor={`${id}-q`} className="block text-sm font-semibold">
          {t("searchLabel")}
        </label>
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={`${id}-status`}
          className={inputClass}
        />
      </div>

      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted"
      >
        {status}
      </p>
      {search.state === "error" && (
        <FormMessage message={errorMessage(search.error)} />
      )}

      {books.length > 0 && (
        <ul
          aria-label={t("resultsList")}
          aria-busy={search.state === "searching"}
          className="divide-y divide-border"
        >
          {books.map((book) => {
            const selected = chosen?.id === book.id;
            return (
              <li key={book.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setChosen(selected ? null : book)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left aria-pressed:bg-border/40"
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
                    {added?.id === book.id && (
                      <span className="mt-1 block text-xs font-semibold">
                        {t("justAdded")}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border"
                    }`}
                  >
                    {selected && <CheckIcon />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <p className="min-w-0 font-semibold">{t("cantFind")}</p>
        <ButtonLink
          href={manualEntryHref(
            query,
            ownPickReturnTo(ownPickHref(challengeId), fromChallenge),
          )}
          // Replaced: after adding, the form comes back here with the new book (`?added=`).
          replace
          prefetch={false}
          variant="secondary"
          className="shrink-0 px-4 text-sm"
        >
          {t("addManually")}
        </ButtonLink>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted">{t("ownPickNote")}</p>
        <Button
          type="button"
          block
          disabled={!chosen || pending}
          aria-busy={pending}
          onClick={submit}
        >
          {t("usePick")}
        </Button>
      </div>
    </div>
  );
}
