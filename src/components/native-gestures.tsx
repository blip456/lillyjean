"use client";

import { useEffect } from "react";

/** Width of the strip along the left and right edge where iOS starts its back/forward swipe. */
export const EDGE = 24;

/** A tap moves less than this; more is a swipe or a scroll. */
const TAP_SLOP = 10;

/** True when the app runs from the home screen (installed), not in a browser tab. */
export function isInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone or iPad (iPadOS reports itself as a Mac with a touch screen). */
export function isIOS() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

/** Whether a touch starting at `x` begins in the edge strip of a screen `width` wide. */
export function startsAtEdge(x: number, width: number) {
  return x < EDGE || x > width - EDGE;
}

/**
 * In the installed app on iOS, a swipe from the left or right edge goes to the previous or next
 * page, like a browser (P47). Cancelling the touch start in the edge strips stops that; ← and the tab
 * bar are the way back. Cancelling also cancels the tap, so a tap there is replayed as a click.
 * In a browser tab nothing changes (there the swipe is the browser's own back gesture), and
 * on Android the system back gesture stays, as in every Android app.
 */
export function NativeGestures() {
  useEffect(() => {
    if (!isInstalledApp() || !isIOS()) return;
    let start: { x: number; y: number; target: Element } | null = null;

    const onStart = (event: TouchEvent) => {
      start = null;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch) return;
      if (!startsAtEdge(touch.clientX, window.innerWidth)) return;
      event.preventDefault();
      if (event.target instanceof Element)
        start = { x: touch.clientX, y: touch.clientY, target: event.target };
    };

    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const { x, y, target } = start;
      start = null;
      if (Math.hypot(touch.clientX - x, touch.clientY - y) > TAP_SLOP) return;
      const control =
        target.closest<HTMLElement>(
          "a, button, label, input, select, textarea, [role='button'], [tabindex]",
        ) ?? (target instanceof HTMLElement ? target : null);
      if (!control) return;
      if (control.matches("input, select, textarea")) control.focus();
      else control.click();
    };

    document.addEventListener("touchstart", onStart, { passive: false });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  return null;
}
