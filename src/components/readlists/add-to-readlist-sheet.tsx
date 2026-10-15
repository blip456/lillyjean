"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useErrorMessage } from "@/components/use-error-message";
import {
  addBookToReadlist,
  createReadlistWithBook,
  removeBookFromReadlist,
} from "@/lib/readlists/actions";
import {
  addCreated,
  initialSelection,
  type ReadlistSelection,
  settle,
  shownBookCount,
  tick,
} from "@/lib/readlists/selection";
import { loadAddToReadlist } from "@/lib/readlists/sheet-actions";
import type { ReadlistSummary } from "@/lib/readlists/types";
import { readlistSchema } from "@/lib/readlists/validation";
import { firstError } from "@/lib/validation";

export type AddToReadlistSheetProps = {
  book: { id: string; title: string; authors: string[] };
  open: boolean;
  onClose: () => void;
};

/**
 * Add-to-readlist sheet (C4): the reader's readlists as a checklist. Ticks save at once (a book
 * can be in many readlists), "New readlist" creates a list with the book in it, Done closes.
 * Opened from the book menu (B5) and the book page (D2). Loads its lists on every opening.
 */
export function AddToReadlistSheet({
  book,
  open,
  onClose,
}: AddToReadlistSheetProps) {
  const t = useTranslations("addToReadlist");
  const tBooks = useTranslations("books");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      description={t("book", {
        title: book.title,
        authors: book.authors.join(", ") || tBooks("unknownAuthor"),
      })}
    >
      {/* Mounted per opening, so it always shows the current lists. */}
      {open && <SheetBody bookId={book.id} onDone={onClose} />}
    </Sheet>
  );
}

type Load = "loading" | "failed" | "ready";
type Message = { text: string; error: boolean } | null;

function SheetBody({ bookId, onDone }: { bookId: string; onDone: () => void }) {
  const t = useTranslations("addToReadlist");
  const [load, setLoad] = useState<Load>("loading");
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<ReadlistSelection | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const focusNext = useRef<string | null>(null);
  const versions = useRef(new Map<string, number>());
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let current = true;
    loadAddToReadlist(bookId).then(
      (data) => {
        if (!current) return;
        setSelection(initialSelection(data.readlists, data.selectedIds));
        setLoad("ready");
      },
      (error: unknown) => {
        console.error(error);
        if (current) setLoad("failed");
      },
    );
    return () => {
      current = false;
    };
  }, [bookId, attempt]);

  // After "New readlist", the new list's checkbox gets the focus.
  useEffect(() => {
    if (!focusNext.current) return;
    listRef.current
      ?.querySelector<HTMLInputElement>(`input[value="${focusNext.current}"]`)
      ?.focus();
    focusNext.current = null;
  }, [selection]);

  const toggle = async (list: ReadlistSummary, ticked: boolean) => {
    const version = (versions.current.get(list.id) ?? 0) + 1;
    versions.current.set(list.id, version);
    setSelection((state) => state && tick(state, list.id, ticked));
    let ok = false;
    try {
      const result = ticked
        ? await addBookToReadlist(list.id, bookId)
        : await removeBookFromReadlist(list.id, bookId);
      ok = result.ok;
    } catch (error) {
      console.error(error);
    }
    const latest = versions.current.get(list.id) === version;
    setSelection(
      (state) => state && settle(state, list.id, ticked, ok, latest),
    );
    if (!latest) return;
    setMessage(
      ok
        ? {
            text: t(ticked ? "added" : "removed", { name: list.name }),
            error: false,
          }
        : { text: t("saveFailed", { name: list.name }), error: true },
    );
  };

  if (load !== "ready" || !selection)
    return (
      <div className="space-y-5">
        {load === "failed" ? (
          <div className="space-y-3" role="alert">
            <p>{t("loadFailed")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setLoad("loading");
                setAttempt((n) => n + 1);
              }}
            >
              {t("retry")}
            </Button>
          </div>
        ) : (
          <div aria-busy="true" className="space-y-3">
            <p role="status" className="text-sm text-muted">
              {t("loading")}
            </p>
            <ul aria-hidden="true" className="space-y-3">
              {[0, 1, 2].map((row) => (
                <li key={row} className="flex items-center gap-3">
                  <span className="size-10 rounded-md bg-border/60 motion-safe:animate-pulse" />
                  <span className="h-4 w-40 rounded bg-border/60 motion-safe:animate-pulse" />
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button block onClick={onDone}>
          {t("done")}
        </Button>
      </div>
    );

  const empty = selection.readlists.length === 0;

  return (
    <div className="space-y-4">
      {empty ? (
        <div className="space-y-1">
          <p className="font-semibold">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("emptyText")}</p>
        </div>
      ) : (
        <fieldset>
          <legend className="sr-only">{t("legend")}</legend>
          <ul
            ref={listRef}
            className="max-h-[45dvh] divide-y divide-border overflow-y-auto"
          >
            {selection.readlists.map((list) => (
              <li key={list.id}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2 pr-1">
                  <Mosaic covers={list.mosaic} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {list.name}
                    </span>
                    <span className="block text-sm text-muted">
                      {t("count", {
                        count: shownBookCount(list, selection),
                      })}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    value={list.id}
                    checked={selection.selected.includes(list.id)}
                    onChange={(event) =>
                      void toggle(list, event.target.checked)
                    }
                    className="size-5 shrink-0 cursor-pointer accent-foreground"
                  />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <NewReadlist
        bookId={bookId}
        startOpen={empty}
        onCreated={(created) => {
          setSelection((state) => state && addCreated(state, created));
          setMessage({
            text: t("created", { name: created.name }),
            error: false,
          });
          focusNext.current = created.id;
        }}
      />

      <p
        role="status"
        aria-live="polite"
        className={
          message?.error
            ? "text-sm font-medium text-danger"
            : "sr-only text-sm text-muted"
        }
      >
        {message?.text}
      </p>

      <Button block onClick={onDone}>
        {t("done")}
      </Button>
    </div>
  );
}

/** Inline "New readlist": a labelled name field and Create; the new list holds the book. */
function NewReadlist({
  bookId,
  startOpen,
  onCreated,
}: {
  bookId: string;
  startOpen: boolean;
  onCreated: (created: ReadlistSummary) => void;
}) {
  const t = useTranslations("addToReadlist");
  const errorMessage = useErrorMessage();
  const id = useId();
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const formId = `${id}-form`;

  const close = () => {
    setOpen(false);
    setName("");
    setError(undefined);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const parsed = readlistSchema.shape.name.safeParse(name);
    if (!parsed.success) {
      setError(errorMessage(firstError(parsed.error)));
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await createReadlistWithBook(parsed.data, bookId);
      if (!result.ok) {
        setError(errorMessage(result.error));
        inputRef.current?.focus();
        return;
      }
      close();
      onCreated(result.data);
    } catch (thrown) {
      console.error(thrown);
      setError(errorMessage("unknown"));
    } finally {
      setPending(false);
    }
  };

  if (!open)
    return (
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={false}
        aria-controls={formId}
        onClick={() => {
          setOpen(true);
          // The field appears in this render; focus it right after.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl pr-1 text-left font-semibold hover:bg-border/40"
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-muted text-xl"
        >
          +
        </span>
        {t("newReadlist")}
      </button>
    );

  return (
    <form
      id={formId}
      noValidate
      onSubmit={submit}
      aria-label={t("newReadlist")}
      className="space-y-3 rounded-2xl border border-border p-4"
    >
      <Field id={`${id}-name`} label={t("nameLabel")} error={error}>
        {(describedBy, invalid) => (
          <Input
            ref={inputRef}
            id={`${id}-name`}
            name="name"
            autoComplete="off"
            enterKeyHint="done"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(undefined);
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>
      <div className="flex items-center justify-end gap-2">
        {!startOpen && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              close();
              requestAnimationFrame(() => toggleRef.current?.focus());
            }}
          >
            {t("cancel")}
          </Button>
        )}
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          aria-busy={pending}
        >
          {t("create")}
        </Button>
      </div>
    </form>
  );
}

/** Small 2×2 mosaic of the newest covers (P19, P40); empty tiles stay plain. */
function Mosaic({ covers }: { covers: ReadlistSummary["mosaic"] }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md border border-border bg-border"
    >
      {[0, 1, 2, 3].map((index) => {
        const cover = covers[index];
        return cover?.coverUrl ? (
          // Same reasoning as BookCover: covers load straight from storage, no optimisation.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={index}
            src={cover.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          <span key={index} className="size-full bg-surface" />
        );
      })}
    </span>
  );
}
