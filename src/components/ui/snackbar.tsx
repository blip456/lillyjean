"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type SnackbarOptions = {
  message: string;
  /** E.g. "Undo" (B4: a snackbar with Undo after a status change). */
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds; Undo stays for 5 s. */
  duration?: number;
};

type Snack = SnackbarOptions & { id: number };

const SnackbarContext = createContext<
  ((options: SnackbarOptions) => void) | null
>(null);

/**
 * Holds the snackbar while something covers it (the completion celebration, E7): the message
 * stays and its timer starts again from the beginning when the hold ends, so Undo is not gone
 * before it could be seen.
 */
const SnackbarHoldContext = createContext<(held: boolean) => void>(() => {});

/**
 * One message at a time at the bottom of the screen, above the tab bar
 * (`--tab-bar-height`, set by the app layout). Announced politely to screen readers.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const [held, setHeld] = useState(false);

  const show = useCallback((options: SnackbarOptions) => {
    setSnack({ duration: 5000, ...options, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!snack || held) return;
    const timer = setTimeout(() => setSnack(null), snack.duration);
    return () => clearTimeout(timer);
  }, [snack, held]);

  const value = useMemo(() => show, [show]);

  return (
    <SnackbarContext.Provider value={value}>
      <SnackbarHoldContext.Provider value={setHeld}>
        {children}
      </SnackbarHoldContext.Provider>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height,0px)+max(1rem,env(safe-area-inset-bottom)))] z-50 flex justify-center px-4"
      >
        {snack && (
          <div
            key={snack.id}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-xl bg-foreground px-4 py-3 text-background shadow-lg"
          >
            <span className="text-sm">{snack.message}</span>
            {snack.actionLabel && snack.onAction && (
              <button
                type="button"
                onClick={() => {
                  snack.onAction?.();
                  setSnack(null);
                }}
                className="min-h-11 shrink-0 px-2 text-sm font-semibold underline underline-offset-4"
              >
                {snack.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const show = useContext(SnackbarContext);
  if (!show) throw new Error("useSnackbar needs a SnackbarProvider");
  return show;
}

/** Call with true while the snackbar is covered, and with false when it shows again. */
export function useSnackbarHold() {
  return useContext(SnackbarHoldContext);
}
