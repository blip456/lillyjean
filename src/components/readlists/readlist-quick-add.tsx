"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import {
  addBookToReadlist,
  removeBookFromReadlist,
} from "@/lib/readlists/actions";

type ReadlistQuickAddProps = {
  bookId: string;
  bookTitle: string;
  readlistId: string;
  readlistName: string;
  /** Whether the book is in the readlist (from the server). */
  added: boolean;
  /** Runs once the book was saved in the readlist (not when it is taken out again). */
  onAdded?: () => void;
};

/**
 * "Add" on a search result opened from a readlist (D1 from C2, P45): puts the book in that
 * readlist at once; tapping "Added" takes it out again, like a tick in the add-to-readlist sheet
 * (C4). The change shows straight away and goes back with a message when saving fails.
 */
export function ReadlistQuickAdd({
  bookId,
  bookTitle,
  readlistId,
  readlistName,
  added,
  onAdded,
}: ReadlistQuickAddProps) {
  const t = useTranslations("readlists.quickAdd");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const [shown, setShown] = useOptimistic(added);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !shown;
      setShown(next);
      const result = await (
        next
          ? addBookToReadlist(readlistId, bookId)
          : removeBookFromReadlist(readlistId, bookId)
      ).catch((error: unknown) => {
        console.error(error);
        return { ok: false as const, error: "unknown" };
      });
      if (!result.ok)
        showSnackbar({ message: errorMessage(result.error) ?? "" });
      else if (next) onAdded?.();
    });

  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={toggle}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
    >
      <span aria-hidden="true">{shown ? "✓" : "+"}</span>
      {shown ? t("added") : t("add")}
      <span className="sr-only">
        {`: ${t("label", { title: bookTitle, name: readlistName })}`}
      </span>
    </button>
  );
}
