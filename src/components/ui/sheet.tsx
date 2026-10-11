"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Optional line under the title, e.g. the book's author. */
  description?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet (B3, D4, N2) on top of the native <dialog>: focus stays inside, Escape and a tap
 * on the backdrop close it, and the page behind is inert.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: SheetProps) {
  const t = useTranslations("books");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element itself is the backdrop area; its content sits in the inner div.
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-md rounded-t-3xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/40 md:max-w-xl"
    >
      <div className="space-y-5 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div
          aria-hidden="true"
          className="mx-auto h-1.5 w-10 rounded-full bg-border"
        />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="font-serif text-xl font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-mt-1 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
