"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Sheet } from "@/components/ui/sheet";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { createReadlist, updateReadlist } from "@/lib/readlists/actions";
import { READLIST_DESCRIPTION_MAX } from "@/lib/readlists/validation";

import { DeleteReadlistConfirm } from "./delete-readlist";

type ReadlistFormProps =
  | {
      mode: "create";
      /** Put this book in the new readlist straight away (C4, a book's page). */
      bookId: string | null;
      /** Same-site path to go back to after creating, instead of the new readlist. */
      returnTo: string | null;
    }
  | {
      mode: "edit";
      readlist: { id: string; name: string; description: string | null };
    };

/**
 * C3 Create / edit readlist: a name (required) and an optional description. No cover upload
 * (automatic mosaic) and no visibility choice (sharing is C5, Sprint 8). Edit mode ends with a
 * "Delete readlist" text button that asks for confirmation (P42).
 */
export function ReadlistForm(props: ReadlistFormProps) {
  const t = useTranslations("readlists");
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(
    props.mode === "create" ? createReadlist : updateReadlist,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const errors = state.fieldErrors ?? {};
  const readlist = props.mode === "edit" ? props.readlist : null;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {props.mode === "create" ? (
          <>
            {props.bookId && (
              <input type="hidden" name="bookId" value={props.bookId} />
            )}
            {props.returnTo && (
              <input type="hidden" name="returnTo" value={props.returnTo} />
            )}
          </>
        ) : (
          <input type="hidden" name="id" value={props.readlist.id} />
        )}
        <FormMessage message={errorMessage(state.error)} />

        <Field
          id="name"
          label={t("form.name")}
          hint={t("form.nameHint")}
          error={errorMessage(errors.name)}
        >
          {(describedBy, invalid) => (
            <Input
              id="name"
              name="name"
              defaultValue={readlist?.name}
              required
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
          )}
        </Field>

        <Field
          id="description"
          label={t("form.description")}
          hint={t("form.descriptionHint")}
          error={errorMessage(errors.description)}
        >
          {(describedBy, invalid) => (
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={readlist?.description ?? undefined}
              maxLength={READLIST_DESCRIPTION_MAX}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={`${inputClass} py-3`}
            />
          )}
        </Field>

        <SubmitButton pending={pending}>
          {props.mode === "create" ? t("form.create") : t("form.save")}
        </SubmitButton>
      </form>

      {readlist && (
        <>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-danger underline-offset-4 hover:underline"
            >
              {t("form.delete")}
            </button>
          </div>
          <Sheet
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title={t("confirmDelete.title")}
          >
            {confirmOpen && (
              <DeleteReadlistConfirm
                readlist={readlist}
                onCancel={() => setConfirmOpen(false)}
              />
            )}
          </Sheet>
        </>
      )}
    </>
  );
}
