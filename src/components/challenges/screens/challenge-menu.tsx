"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet } from "@/components/ui/sheet";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { deleteChallenge } from "@/lib/challenges/actions";
import { editChallengeHref } from "@/lib/challenges/links";

const actionClass =
  "flex min-h-12 w-full items-center rounded-xl px-4 text-left font-semibold hover:bg-border/40";

type ChallengeMenuProps = {
  challenge: { id: string; title: string };
  /** Edit (E6 before the start, E8 after): the creator, while the challenge is not completed. */
  canEdit: boolean;
  /** Delete: the creator, while the challenge is not completed (P50). */
  canDelete: boolean;
};

/**
 * Overflow ⋯ on a challenge (E4): Edit and Delete, which asks for confirmation in the same sheet
 * (P50; for a personal challenge Leave = Delete). Recommend and Leave for shared challenges
 * arrive with friends. Closing the sheet returns focus to ⋯ (native dialog).
 */
export function ChallengeMenu({
  challenge,
  canEdit,
  canDelete,
}: ChallengeMenuProps) {
  const t = useTranslations("challengeScreens");
  const [view, setView] = useState<"menu" | "confirm" | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label={t("more")}
        aria-haspopup="dialog"
        aria-expanded={view !== null}
        onClick={() => setView("menu")}
        className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      <Sheet
        open={view !== null}
        onClose={() => setView(null)}
        title={view === "confirm" ? t("confirmDelete.title") : challenge.title}
      >
        {view === "confirm" ? (
          <DeleteChallengeConfirm
            challenge={challenge}
            onCancel={() => setView(null)}
          />
        ) : (
          <ul className="-mx-2 space-y-1">
            {canEdit && (
              <li>
                <Link
                  href={editChallengeHref(challenge.id)}
                  onClick={() => setView(null)}
                  className={actionClass}
                >
                  {t("edit")}
                </Link>
              </li>
            )}
            {canDelete && (
              <li>
                <button
                  type="button"
                  className={`${actionClass} text-danger`}
                  onClick={() => setView("confirm")}
                >
                  {t("delete")}
                </button>
              </li>
            )}
          </ul>
        )}
      </Sheet>
    </>
  );
}

/** "Delete this challenge?": focus starts on the safe choice, Keep it. */
function DeleteChallengeConfirm({
  challenge,
  onCancel,
}: {
  challenge: { id: string; title: string };
  onCancel: () => void;
}) {
  const t = useTranslations("challengeScreens");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteChallenge(challenge.id).catch(
        (error: unknown) => {
          console.error(error);
          return { ok: false as const, error: "unknown" };
        },
      );
      // On success the action redirects to the Challenges tab.
      if (result && !result.ok)
        showSnackbar({ message: errorMessage(result.error) ?? "" });
    });

  return (
    <div className="space-y-5">
      <p>{t("confirmDelete.text", { title: challenge.title })}</p>
      <div className="grid gap-3">
        <Button
          type="button"
          variant="danger"
          block
          disabled={pending}
          aria-busy={pending}
          onClick={confirm}
        >
          {t("confirmDelete.confirm")}
        </Button>
        <Button
          ref={cancelRef}
          type="button"
          variant="secondary"
          block
          onClick={onCancel}
        >
          {t("confirmDelete.cancel")}
        </Button>
      </div>
    </div>
  );
}
