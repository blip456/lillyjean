"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Sheet } from "@/components/ui/sheet";
import { Link } from "@/components/ui/link";
import { editReadlistHref } from "@/lib/readlists/links";

import { DeleteReadlistConfirm } from "./delete-readlist";

const actionClass =
  "flex min-h-12 w-full items-center rounded-xl px-4 text-left font-semibold hover:bg-border/40";

type ReadlistMenuProps = {
  readlist: { id: string; name: string };
  /** "n books", shown under the name in the sheet. */
  summary: string;
};

/**
 * Overflow ⋯ on a readlist (C2): Edit (C3) and Delete, which asks for confirmation in the same
 * sheet (P42). Leave (shared lists) arrives with sharing in Sprint 8. Closing the sheet returns
 * focus to ⋯ (native dialog).
 */
export function ReadlistMenu({ readlist, summary }: ReadlistMenuProps) {
  const t = useTranslations("readlists");
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
        title={view === "confirm" ? t("confirmDelete.title") : readlist.name}
        description={view === "confirm" ? undefined : summary}
      >
        {view === "confirm" ? (
          <DeleteReadlistConfirm
            readlist={readlist}
            onCancel={() => setView(null)}
          />
        ) : (
          <ul className="-mx-2 space-y-1">
            <li>
              <Link
                href={editReadlistHref(readlist.id)}
                onClick={() => setView(null)}
                className={actionClass}
              >
                {t("edit")}
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={`${actionClass} text-danger`}
                onClick={() => setView("confirm")}
              >
                {t("delete")}
              </button>
            </li>
          </ul>
        )}
      </Sheet>
    </>
  );
}
