"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useSnackbarHold } from "@/components/ui/snackbar";
import type { CompletedChallenge } from "@/lib/challenges/types";

import { CelebrationScreen } from "./integration/celebration-screen";
import {
  type CelebrationMoment,
  currentMoment,
  dismiss,
  enqueue,
} from "./integration/celebration-queue";

/**
 * Shows the completion celebration (E7) for challenges that a read or a pick just completed.
 * Shared contract: call `useCelebrate()(completed)` with what `pickChallengeBook` or the
 * mark-as-read flow returned; an empty list does nothing.
 *
 * The provider sits in the signed-in layout, so the celebration survives the navigation that
 * often follows a save (e.g. the + menu's Mark as read goes back to Home). Calls while it is open
 * queue up; one read that completes several challenges is one moment (P10).
 */
type Celebrate = (completed: CompletedChallenge[]) => void;

const CelebrationContext = createContext<Celebrate>(() => {});

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<CelebrationMoment[]>([]);
  const lastKey = useRef(0);

  const celebrate = useCallback<Celebrate>((completed) => {
    if (!completed?.length) return;
    setQueue((current) => enqueue(current, completed, () => ++lastKey.current));
  }, []);

  const moment = currentMoment(queue);
  // The celebration covers the "Marked as read · Undo" snackbar: keep it until the screen closes.
  const holdSnackbar = useSnackbarHold();
  const showing = moment !== null;
  useEffect(() => {
    holdSnackbar(showing);
  }, [holdSnackbar, showing]);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {moment && (
        <CelebrationScreen
          moment={moment}
          hasNext={queue.length > 1}
          onDone={() => setQueue(dismiss)}
          onClose={() => setQueue([])}
        />
      )}
    </CelebrationContext.Provider>
  );
}

export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext);
}
