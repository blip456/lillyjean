"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useCelebrate } from "@/components/challenges/celebration";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { pickChallengeBook } from "@/lib/challenges/actions";

/**
 * Makes a book my pick for a challenge (E4 "Add this book", E5 "Use as my pick"). When the book
 * was already read inside the window, the challenge completes at once (P51): the celebration
 * (E7) shows, and a snackbar says so too. `onDone` runs after a successful pick.
 */
export function usePick(challengeId: string) {
  const t = useTranslations("challengeScreens");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const celebrate = useCelebrate();
  const [pending, startTransition] = useTransition();

  const pick = (book: { id: string; title: string }, onDone?: () => void) =>
    startTransition(async () => {
      const result = await pickChallengeBook(challengeId, book.id).catch(
        (error: unknown) => {
          console.error(error);
          return { ok: false as const, error: "unknown" };
        },
      );
      if (!result.ok) {
        showSnackbar({ message: errorMessage(result.error) ?? "" });
        return;
      }
      const { completed } = result.data;
      if (completed) {
        celebrate([completed]);
        showSnackbar({
          message: t("completedSnack", { title: completed.bookTitle }),
        });
      } else {
        showSnackbar({ message: t("picked", { title: book.title }) });
      }
      onDone?.();
    });

  return { pick, pending };
}
