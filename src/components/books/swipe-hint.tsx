"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useSyncExternalStore } from "react";

const STORAGE_KEY = "lillyjean:swipe-hint-dismissed";

/**
 * One-time hint "Tip: swipe a book to change its status" (P37). Shown above the first swipeable
 * book row on the screen, until it is dismissed or the reader swipes a book. Remembered in
 * localStorage; without storage (private mode) it is remembered until the app is closed.
 */
let dismissed: boolean | null = null;
/** Rows that could show the hint, in mount order; the first one shows it. */
const rows: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isDismissed() {
  if (dismissed === null) {
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      dismissed = false;
    }
  }
  return dismissed;
}

export function dismissSwipeHint() {
  if (dismissed === true) return;
  dismissed = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage unavailable: remembered for this visit only.
  }
  emit();
}

/** True for the one row that shows the hint. */
export function useSwipeHint(enabled: boolean) {
  const id = useId();

  useEffect(() => {
    if (!enabled) return;
    rows.push(id);
    emit();
    return () => {
      rows.splice(rows.indexOf(id), 1);
      emit();
    };
  }, [enabled, id]);

  return useSyncExternalStore(
    subscribe,
    () => enabled && rows[0] === id && !isDismissed(),
    () => false,
  );
}

/** `onDismiss` can move focus to the row, because the dismiss button disappears. */
export function SwipeHint({ onDismiss }: { onDismiss?: () => void }) {
  const t = useTranslations("bookStatus");

  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface py-1 pr-1 pl-4 text-sm">
      <p className="flex-1">
        <span aria-hidden="true">← </span>
        {t("swipeHint")}
      </p>
      <button
        type="button"
        onClick={() => {
          dismissSwipeHint();
          onDismiss?.();
        }}
        aria-label={t("dismissHint")}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
