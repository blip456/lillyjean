"use client";

import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ACTION_WIDTH,
  commitDistance,
  decideSwipe,
  dragOffset,
  swipeIntent,
  type SwipeIntent,
  type SwipeLayout,
  velocityOf,
} from "./swipe";

type Gesture = {
  pointerId: number;
  x0: number;
  y0: number;
  /** Where the row was when the finger went down (0, or open). */
  start: number;
  intent: SwipeIntent;
  x: number;
  long: boolean;
  rowWidth: number;
  samples: { x: number; t: number }[];
};

type SwipeRowProps = {
  /** The row itself; it slides to the left. */
  children: ReactNode;
  /** Buttons revealed behind the row (ACTION_WIDTH each); a tap on one slides the row back. */
  actions: ReactNode;
  actionCount: number;
  /** Shown behind the row during a long swipe, e.g. "Reading". */
  commitLabel: ReactNode;
  commitClassName: string;
  /** A long swipe was let go. */
  onCommit: () => void;
  /** The reader swiped successfully (opened the row or made a long swipe). */
  onSwiped?: () => void;
  enabled?: boolean;
};

function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported (iOS) or blocked: skipped silently.
  }
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Swipe a row to the left to reveal actions; a long swipe runs `onCommit` (B4, P24).
 *
 * Built for 60 fps on mid-range phones: pointer events, and while dragging only a CSS transform
 * written once per animation frame (no React renders, no layout). `touch-action: pan-y` keeps
 * vertical scrolling native; the first few pixels decide between swipe and scroll. A drag never
 * triggers the link inside the row. Snaps on distance and speed; no animation with reduced motion.
 */
export function SwipeRow({
  children,
  actions,
  actionCount,
  commitLabel,
  commitClassName,
  onCommit,
  onSwiped,
  enabled = true,
}: SwipeRowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const offset = useRef(0);
  const frame = useRef(0);
  const suppressClickUntil = useRef(0);
  const [open, setOpen] = useState(false);
  const revealWidth = ACTION_WIDTH * actionCount;

  const snap = useCallback((x: number) => {
    const row = rowRef.current;
    if (!row) return;
    offset.current = x;
    row.style.transition = reducedMotion()
      ? "none"
      : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    row.style.transform = x ? `translate3d(${x}px, 0, 0)` : "";
    row.style.willChange = "";
    if (rootRef.current) rootRef.current.dataset.long = "false";
    setOpen(x !== 0);
  }, []);

  const close = useCallback(() => snap(0), [snap]);

  // An open row closes when the reader touches anything else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  if (!enabled) return <div>{children}</div>;

  const layoutOf = (g: Gesture): SwipeLayout => ({
    revealWidth,
    rowWidth: g.rowWidth,
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = {
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      start: offset.current,
      intent: null,
      x: offset.current,
      long: false,
      rowWidth: 0,
      samples: [{ x: event.clientX, t: event.timeStamp }],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const row = rowRef.current;
    if (!g || !row || g.pointerId !== event.pointerId) return;
    const dx = event.clientX - g.x0;

    if (g.intent === null) {
      g.intent = swipeIntent(dx, event.clientY - g.y0);
      if (g.intent === null) return;
      if (g.intent === "vertical") {
        gesture.current = null;
        return;
      }
      // Sideways: from now on this gesture is ours.
      row.setPointerCapture(event.pointerId);
      g.rowWidth = rootRef.current?.offsetWidth ?? 0;
      row.style.transition = "none";
      row.style.willChange = "transform";
    }

    g.samples.push({ x: event.clientX, t: event.timeStamp });
    if (g.samples.length > 6) g.samples.shift();
    g.x = dragOffset(g.start, dx, layoutOf(g));

    const long = -g.x >= commitDistance(layoutOf(g));
    if (long !== g.long) {
      g.long = long;
      if (rootRef.current) rootRef.current.dataset.long = String(long);
      if (long) haptic();
    }

    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const current = gesture.current;
        if (current && rowRef.current)
          rowRef.current.style.transform = `translate3d(${current.x}px, 0, 0)`;
      });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (g.intent !== "horizontal") return; // A tap: the click handler below decides.

    cancelAnimationFrame(frame.current);
    frame.current = 0;
    suppressClickUntil.current = event.timeStamp + 500;
    const decision = decideSwipe(g.x, velocityOf(g.samples), layoutOf(g));
    if (decision === "commit") {
      snap(0);
      onSwiped?.();
      onCommit();
    } else {
      snap(decision === "open" ? -revealWidth : 0);
      if (decision === "open") onSwiped?.();
    }
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (g.intent === "horizontal") snap(g.start);
  };

  return (
    <div ref={rootRef} className="group relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: revealWidth }}
        inert={!open}
        onClick={close}
      >
        {actions}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-end px-5 text-sm font-semibold opacity-0 transition-opacity duration-150 group-data-[long=true]:opacity-100 motion-reduce:transition-none ${commitClassName}`}
      >
        {commitLabel}
      </div>
      <div
        ref={rowRef}
        className="relative touch-pan-y bg-background select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          const afterDrag = event.timeStamp < suppressClickUntil.current;
          if (!afterDrag && !open) return;
          // A drag is not a tap; a tap on an open row closes it.
          event.preventDefault();
          event.stopPropagation();
          if (!afterDrag) close();
        }}
      >
        {children}
      </div>
    </div>
  );
}
