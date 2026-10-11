/**
 * Pure maths for swipe to change status (B4, P24), unit tested in swipe.test.ts. Offsets are in
 * CSS pixels and negative to the left (the row slides left to reveal the statuses).
 */

/** Movement before we decide between a horizontal swipe and a vertical scroll. */
export const SWIPE_SLOP = 8;
/** Width of each revealed status button. */
export const ACTION_WIDTH = 72;
/** A flick faster than this (px/ms) opens or closes the row whatever the distance. */
export const FLICK_VELOCITY = 0.45;

export type SwipeIntent = "horizontal" | "vertical" | null;

/**
 * Decides once per gesture whether the finger moves sideways (we take over) or up and down
 * (the browser scrolls). `null` = not moved enough to tell yet.
 */
export function swipeIntent(
  dx: number,
  dy: number,
  slop = SWIPE_SLOP,
): SwipeIntent {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < slop && ay < slop) return null;
  return ax > ay * 1.2 ? "horizontal" : "vertical";
}

export type SwipeLayout = {
  /** Width of the revealed status buttons. */
  revealWidth: number;
  /** Width of the row; a long swipe goes past most of it. */
  rowWidth: number;
};

/** Distance (positive) from which letting go applies the next status. */
export function commitDistance({ revealWidth, rowWidth }: SwipeLayout): number {
  return Math.max(revealWidth + 40, rowWidth * 0.7);
}

/**
 * Where the row sits while dragging: follows the finger to the left up to the row width, with
 * resistance beyond that and when pulled right past the closed position.
 */
export function dragOffset(
  start: number,
  dx: number,
  { rowWidth }: SwipeLayout,
): number {
  const raw = start + dx;
  if (raw > 0) return rubberBand(raw);
  if (raw < -rowWidth) return -rowWidth - rubberBand(-rowWidth - raw);
  return raw;
}

function rubberBand(distance: number) {
  return Math.round(distance * 0.25);
}

export type SwipeDecision = "closed" | "open" | "commit";

/**
 * Where the row snaps when the finger lets go, based on distance and speed.
 * `velocity` is px/ms, negative to the left.
 */
export function decideSwipe(
  offset: number,
  velocity: number,
  layout: SwipeLayout,
): SwipeDecision {
  const distance = -offset;
  // A long swipe only counts on distance, so a quick flick never changes a status by accident.
  if (distance >= commitDistance(layout)) return "commit";
  if (velocity <= -FLICK_VELOCITY && distance > SWIPE_SLOP) return "open";
  if (velocity >= FLICK_VELOCITY) return "closed";
  return distance > layout.revealWidth / 2 ? "open" : "closed";
}

/** Speed from the last pointer samples (px/ms), ignoring samples older than 100 ms. */
export function velocityOf(samples: { x: number; t: number }[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const recent = samples.filter((sample) => last.t - sample.t <= 100);
  // A paused finger leaves one recent sample; the older one then gives a (low) speed.
  const first = recent.length > 1 ? recent[0] : samples[samples.length - 2];
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}
