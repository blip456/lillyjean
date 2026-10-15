/**
 * Pure rules for the long-press menu on a book row (B5, P24, P41), unit tested in
 * long-press.test.ts. Distances are CSS pixels, times milliseconds.
 */

/** How long a finger (or mouse button) must rest on a row before the menu opens. */
export const LONG_PRESS_MS = 480;
/**
 * Movement that cancels a long press. Equal to the swipe slop (SWIPE_SLOP), so a press is
 * cancelled at the latest when the row decides between a swipe and a vertical scroll.
 */
export const LONG_PRESS_SLOP = 8;
/**
 * After a long press opened the menu, clicks are ignored until this long after the release (the
 * browser's own click for the release), or until the next touch.
 */
export const CLICK_GUARD_MS = 400;

/** True once the pointer moved far enough from where it went down to be a swipe or scroll. */
export function movedTooFar(
  dx: number,
  dy: number,
  slop = LONG_PRESS_SLOP,
): boolean {
  return Math.hypot(dx, dy) >= slop;
}

/** True when a pointer that was held from `downAt` until `now` (still) counts as a long press. */
export function isLongPress(
  downAt: number,
  now: number,
  duration = LONG_PRESS_MS,
): boolean {
  return now - downAt >= duration;
}

/** Only the primary button of a mouse starts a long press; touch and pen always do. */
export function startsLongPress(pointer: {
  pointerType: string;
  button: number;
  isPrimary: boolean;
}): boolean {
  if (!pointer.isPrimary) return false;
  return pointer.pointerType !== "mouse" || pointer.button === 0;
}

/** The keyboard way to open the menu: the Menu (ContextMenu) key, or Shift+F10. */
export function isMenuKey(event: { key: string; shiftKey: boolean }): boolean {
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

/** An extra item for the menu, e.g. "Remove from this readlist" on a readlist (C2). */
export type BookMenuAction = { label: string; onSelect: () => void };

export type BookMenuItem =
  | { kind: "addToReadlist" }
  | { kind: "changeStatus" }
  | { kind: "openBook" }
  | { kind: "custom"; label: string; onSelect: () => void };

/**
 * The items of the long-press menu in their order: Add to readlist, Change status, Open book
 * (B5; Recommend joins in Sprint 8), then the extra items the page passes in.
 */
export function bookMenuItems(extra: BookMenuAction[] = []): BookMenuItem[] {
  return [
    { kind: "addToReadlist" },
    { kind: "changeStatus" },
    { kind: "openBook" },
    ...extra.map((action) => ({ kind: "custom" as const, ...action })),
  ];
}
