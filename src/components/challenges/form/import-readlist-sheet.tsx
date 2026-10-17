"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ChevronIcon } from "@/components/navigation/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { BookListItem } from "@/lib/books/types";
import {
  loadReadlistBooks,
  loadReadlistsForImport,
} from "@/lib/challenges/form-actions";
import type { ReadlistSummary } from "@/lib/readlists/types";

type ImportReadlistSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the readlist's books; the form adds them and closes the sheet. */
  onImport: (readlist: { name: string }, books: BookListItem[]) => void;
};

/**
 * "Import from a readlist" in the challenge form (E6, E8): my readlists; a tap adds all books of
 * that list to the candidates in one go (duplicates skipped by the form). Loads on every opening.
 */
export function ImportReadlistSheet({
  open,
  onClose,
  onImport,
}: ImportReadlistSheetProps) {
  const t = useTranslations("challengeForm.import");

  return (
    <Sheet open={open} onClose={onClose} title={t("title")}>
      {open && <ImportBody onImport={onImport} onCancel={onClose} />}
    </Sheet>
  );
}

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; readlists: ReadlistSummary[] };

function ImportBody({
  onImport,
  onCancel,
}: {
  onImport: ImportReadlistSheetProps["onImport"];
  onCancel: () => void;
}) {
  const t = useTranslations("challengeForm.import");
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    loadReadlistsForImport().then(
      (readlists) => current && setLoad({ state: "ready", readlists }),
      (error: unknown) => {
        console.error(error);
        if (current) setLoad({ state: "failed" });
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  const choose = async (readlist: ReadlistSummary) => {
    if (busyId) return;
    setBusyId(readlist.id);
    setFailed(false);
    let books: BookListItem[] | null = null;
    try {
      books = await loadReadlistBooks(readlist.id);
    } catch (error) {
      console.error(error);
    }
    setBusyId(null);
    if (books) onImport(readlist, books);
    else setFailed(true);
  };

  if (load.state !== "ready")
    return (
      <div className="space-y-4">
        {load.state === "failed" ? (
          <div role="alert" className="space-y-3">
            <p>{t("loadFailed")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setLoad({ state: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              {t("retry")}
            </Button>
          </div>
        ) : (
          <p role="status" aria-busy="true" className="text-sm text-muted">
            {t("loading")}
          </p>
        )}
        <Button block variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      {load.readlists.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul className="max-h-[45dvh] divide-y divide-border overflow-y-auto">
          {load.readlists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                disabled={list.bookCount === 0 || Boolean(busyId)}
                aria-busy={busyId === list.id || undefined}
                onClick={() => void choose(list)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg py-2 text-left disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {list.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {t("count", { count: list.bookCount })}
                  </span>
                </span>
                <ChevronIcon className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {failed && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t("booksFailed")}
        </p>
      )}
      <Button block variant="secondary" onClick={onCancel}>
        {t("cancel")}
      </Button>
    </div>
  );
}
