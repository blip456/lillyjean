"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { deleteReadlistAndLeave } from "@/lib/readlists/delete-action";

type DeleteReadlistConfirmProps = {
  readlist: { id: string; name: string };
  onCancel: () => void;
};

/**
 * Body of the "Delete this readlist?" sheet (C2 overflow, C3 edit; P42). Deleting goes to the
 * overview with "Readlist deleted"; the books stay on the shelf. Focus starts on the safe choice.
 */
export function DeleteReadlistConfirm({
  readlist,
  onCancel,
}: DeleteReadlistConfirmProps) {
  const t = useTranslations("readlists");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteReadlistAndLeave(readlist.id).catch(
        (error: unknown) => {
          console.error(error);
          return { ok: false as const, error: "unknown" };
        },
      );
      // On success the action redirects to the overview, which confirms the deletion.
      if (result && !result.ok)
        showSnackbar({ message: errorMessage(result.error) ?? "" });
    });

  return (
    <div className="space-y-5">
      <p>{t("confirmDelete.text", { name: readlist.name })}</p>
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
