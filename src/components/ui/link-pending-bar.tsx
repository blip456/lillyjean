"use client";

import { useLinkStatus } from "next/link";

/** Progress bar at the top of the screen while a tapped link is loading (fades in after 150 ms). */
export function LinkPendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden="true"
      className="link-pending-bar pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent"
    />
  );
}
