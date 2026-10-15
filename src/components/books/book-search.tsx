"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type MouseEvent,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import { ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Link } from "@/components/ui/link";
import { useErrorMessage } from "@/components/use-error-message";
import {
  isSearchable,
  manualEntryHref,
  SEARCH_PATH,
  type SearchTarget,
  searchHref,
  targetParams,
} from "@/lib/books/navigation";
import {
  type BookListItem,
  SEARCH_FIELDS,
  type SearchField,
} from "@/lib/books/types";
import { SEARCH_MAX_LENGTH } from "@/lib/books/validation";

import { BookRow, type QuickAdd } from "./book-row";

/** Wait this long after the last keystroke before searching. */
const DEBOUNCE_MS = 300;

/** Where added books go (P45); a readlist comes with its name and the books already in it. */
export type AddTarget =
  | Extract<SearchTarget, { kind: "status" }>
  | (Extract<SearchTarget, { kind: "readlist" }> & {
      name: string;
      bookIds: string[];
    });

/** The quick action on a result: the target's, or "+ Want to read" for a plain search. */
function quickAddFor(book: BookListItem, target: AddTarget | null): QuickAdd {
  if (target?.kind === "readlist")
    return {
      kind: "readlist",
      readlistId: target.readlistId,
      readlistName: target.name,
      added: target.bookIds.includes(book.id),
    };
  return { kind: "status", status: target?.status ?? "want_to_read" };
}

type BookSearchProps = {
  /** Search text and filter the results belong to (from the URL). */
  query: string;
  field: SearchField;
  results: BookListItem[];
  /** Error key under `errors` when the search failed. */
  error: string | null;
  /** The page the search was opened from (P45); null for a plain search. */
  target?: AddTarget | null;
};

/**
 * Book search (D1): live results while typing. The text and filter live in the URL, and the
 * page renders the results on the server, so back, refresh and a status change on a result
 * (which refreshes the page) always show the current state. Works without JavaScript too.
 */
export function BookSearch({
  query,
  field,
  results,
  error,
  target = null,
}: BookSearchProps) {
  const t = useTranslations("bookSearch");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState(query);
  const [activeField, setActiveField] = useOptimistic(field);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (nextText: string, nextField: SearchField) => {
    clearTimeout(timer.current);
    startTransition(() => {
      setActiveField(nextField);
      router.replace(searchHref(nextText, nextField, target), {
        scroll: false,
      });
    });
  };

  const searchable = isSearchable(text);
  const waiting = pending || (searchable && text.trim() !== query.trim());
  const showResults = searchable && !error && isSearchable(query);

  const empty = showResults && !waiting && results.length === 0;
  let status = "";
  if (searchable) {
    if (waiting) status = t("searching");
    else if (!error) status = t("results", { count: results.length });
  }

  return (
    <div className="space-y-5">
      <form
        role="search"
        action={SEARCH_PATH}
        onSubmit={(event) => {
          event.preventDefault();
          search(text, activeField);
        }}
        className="space-y-3"
      >
        <label htmlFor={`${id}-q`} className="block text-sm font-semibold">
          {t("label")}
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(
              () => search(value, activeField),
              DEBOUNCE_MS,
            );
          }}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={`${id}-status`}
          className={inputClass}
        />
        {activeField !== "all" && (
          <input type="hidden" name="field" value={activeField} />
        )}
        {Object.entries(targetParams(target)).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div
          role="group"
          aria-label={t("filter")}
          className="flex flex-wrap gap-2"
        >
          {SEARCH_FIELDS.map((option) => {
            const current = option === activeField;
            return (
              <Link
                key={option}
                href={searchHref(text, option, target)}
                prefetch={false}
                replace
                scroll={false}
                aria-current={current ? "true" : undefined}
                onClick={(event: MouseEvent) => {
                  event.preventDefault();
                  if (!current) search(text, option);
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold aria-[current=true]:border-foreground aria-[current=true]:bg-foreground aria-[current=true]:text-background"
              >
                {t(`fields.${option}`)}
              </Link>
            );
          })}
        </div>
      </form>

      <div className="space-y-2">
        <p
          id={`${id}-status`}
          role="status"
          aria-live="polite"
          className={`min-h-5 text-sm ${empty ? "font-semibold" : "text-muted"}`}
        >
          {status}
        </p>

        {searchable && error && !waiting && (
          <FormMessage message={errorMessage(error)} />
        )}

        {showResults &&
          (results.length > 0 ? (
            <ul
              aria-label={t("resultsList")}
              aria-busy={waiting}
              className={`divide-y divide-border transition-opacity ${waiting ? "opacity-60" : ""}`}
            >
              {results.map((book) => (
                <li key={book.id}>
                  <BookRow book={book} quickAdd={quickAddFor(book, target)} />
                </li>
              ))}
            </ul>
          ) : (
            !waiting && (
              <p className="text-sm text-muted">{t("noResultsHint")}</p>
            )
          ))}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0">
          <p className="font-semibold">{t("cantFind")}</p>
          <p className="text-sm text-muted">{t("addYourself")}</p>
        </div>
        <ButtonLink
          href={manualEntryHref(text, null, target)}
          // The title changes with every keystroke; prefetching each version is wasteful.
          prefetch={false}
          variant="secondary"
          className="shrink-0 px-4 text-sm"
        >
          {t("addManually")}
        </ButtonLink>
      </div>
    </div>
  );
}
