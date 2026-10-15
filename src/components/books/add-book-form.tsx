"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, inputClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useErrorMessage } from "@/components/use-error-message";
import { useFormAction } from "@/components/use-form-action";
import { addManualBook } from "@/lib/books/actions";
import { BOOK_STATUSES, type BookStatus } from "@/lib/books/types";
import { MANUAL_DESCRIPTION_MAX_LENGTH } from "@/lib/books/validation";

import { BookCover } from "./book-cover";

type AddBookFormProps = {
  /** Prefilled from the search text (D1, A10). */
  defaultTitle: string;
  /** The status of the shelf list the search came from (P45); otherwise Want to read. */
  defaultStatus?: BookStatus;
  /** The readlist the search came from (P45): the new book goes in it too. */
  readlistId?: string | null;
  /** Same-site path to go back to after adding, e.g. onboarding; otherwise the book page. */
  returnTo: string | null;
};

/** Add a book manually (D3): title and author required (P36), a generated cover. */
export function AddBookForm({
  defaultTitle,
  defaultStatus = "want_to_read",
  readlistId = null,
  returnTo,
}: AddBookFormProps) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { state, onSubmit, pending } = useFormAction(addManualBook);
  const [title, setTitle] = useState(defaultTitle);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {readlistId && (
        <input type="hidden" name="readlistId" value={readlistId} />
      )}
      <FormMessage message={errorMessage(state.error)} />

      <Field
        id="title"
        label={t("addBook.bookTitle")}
        hint={t("addBook.required")}
        error={errorMessage(errors.title)}
      >
        {(describedBy, invalid) => (
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoComplete="off"
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field
        id="author"
        label={t("addBook.author")}
        hint={t("addBook.required")}
        error={errorMessage(errors.author)}
      >
        {(describedBy, invalid) => (
          <Input
            id="author"
            name="author"
            required
            autoComplete="off"
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field
        id="isbn"
        label={t("addBook.isbn")}
        hint={t("addBook.isbnHint")}
        error={errorMessage(errors.isbn)}
      >
        {(describedBy, invalid) => (
          <Input
            id="isbn"
            name="isbn"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field
        id="description"
        label={t("addBook.description")}
        error={errorMessage(errors.description)}
      >
        {(describedBy, invalid) => (
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={MANUAL_DESCRIPTION_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`${inputClass} py-3`}
          />
        )}
      </Field>

      <div className="flex items-center gap-4">
        <BookCover title={title.trim()} coverUrl={null} size="sm" />
        <p>
          <span className="block text-sm font-semibold">
            {t("addBook.cover")}
          </span>
          <span className="block text-sm text-muted">
            {t("addBook.coverHint")}
          </span>
        </p>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-semibold">
          {t("addBook.status")}
        </legend>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-surface">
          {BOOK_STATUSES.map((status) => (
            <label
              key={status}
              className="flex min-h-11 cursor-pointer items-center justify-center border-l border-border px-2 text-center text-sm font-semibold first:border-l-0 has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="status"
                value={status}
                defaultChecked={status === defaultStatus}
                className="sr-only"
              />
              {t(`books.status.${status}`)}
            </label>
          ))}
        </div>
        {errors.status && (
          <p className="text-sm font-medium text-danger">
            {errorMessage(errors.status)}
          </p>
        )}
      </fieldset>

      <SubmitButton pending={pending}>{t("addBook.submit")}</SubmitButton>
    </form>
  );
}
