"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { CompletedChallenge } from "@/lib/challenges/types";

/**
 * Shows the completion celebration (E7) for challenges that a read or a pick just completed.
 * Shared contract: call `useCelebrate()(completed)` with what `pickChallengeBook` or the
 * mark-as-read flow returned; an empty list does nothing.
 *
 * Foundation stub: the provider below does nothing yet. The integration feature (Sprint 5)
 * replaces it with the full-screen E7 and mounts it in the signed-in frame.
 */
type Celebrate = (completed: CompletedChallenge[]) => void;

const CelebrationContext = createContext<Celebrate>(() => {});

export function CelebrationProvider({ children }: { children: ReactNode }) {
  return (
    <CelebrationContext.Provider value={() => {}}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext);
}
