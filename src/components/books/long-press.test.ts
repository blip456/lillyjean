import { describe, expect, it, vi } from "vitest";

import {
  bookMenuItems,
  isLongPress,
  isMenuKey,
  LONG_PRESS_MS,
  LONG_PRESS_SLOP,
  movedTooFar,
  startsLongPress,
} from "./long-press";
import { SWIPE_SLOP, swipeIntent } from "./swipe";

describe("movedTooFar", () => {
  it("keeps a resting or slightly trembling finger as a press", () => {
    expect(movedTooFar(0, 0)).toBe(false);
    expect(movedTooFar(3, -4)).toBe(false);
    expect(movedTooFar(-5, 5)).toBe(false);
  });

  it("cancels the press once the finger moved the slop in any direction", () => {
    expect(movedTooFar(8, 0)).toBe(true);
    expect(movedTooFar(0, -8)).toBe(true);
    expect(movedTooFar(6, 6)).toBe(true);
  });

  it("cancels no later than the row decides between swipe and scroll", () => {
    expect(LONG_PRESS_SLOP).toBeLessThanOrEqual(SWIPE_SLOP);
    for (const [dx, dy] of [
      [8, 0],
      [-8, 1],
      [0, 8],
      [7, -7],
    ])
      if (swipeIntent(dx, dy) !== null) expect(movedTooFar(dx, dy)).toBe(true);
  });
});

describe("isLongPress", () => {
  it("needs the press to last the full duration", () => {
    expect(isLongPress(1000, 1000 + LONG_PRESS_MS - 1)).toBe(false);
    expect(isLongPress(1000, 1000 + LONG_PRESS_MS)).toBe(true);
  });

  it("uses a duration between a tap and a deliberate hold", () => {
    expect(LONG_PRESS_MS).toBeGreaterThanOrEqual(450);
    expect(LONG_PRESS_MS).toBeLessThanOrEqual(500);
  });
});

describe("startsLongPress", () => {
  it("starts on touch and pen", () => {
    expect(
      startsLongPress({ pointerType: "touch", button: 0, isPrimary: true }),
    ).toBe(true);
    expect(
      startsLongPress({ pointerType: "pen", button: 0, isPrimary: true }),
    ).toBe(true);
  });

  it("starts only on the main mouse button (right-click has its own menu event)", () => {
    expect(
      startsLongPress({ pointerType: "mouse", button: 0, isPrimary: true }),
    ).toBe(true);
    expect(
      startsLongPress({ pointerType: "mouse", button: 2, isPrimary: true }),
    ).toBe(false);
  });

  it("ignores a second finger", () => {
    expect(
      startsLongPress({ pointerType: "touch", button: 0, isPrimary: false }),
    ).toBe(false);
  });
});

describe("isMenuKey", () => {
  it("accepts the Menu key and Shift+F10", () => {
    expect(isMenuKey({ key: "ContextMenu", shiftKey: false })).toBe(true);
    expect(isMenuKey({ key: "F10", shiftKey: true })).toBe(true);
  });

  it("ignores F10 alone and other keys", () => {
    expect(isMenuKey({ key: "F10", shiftKey: false })).toBe(false);
    expect(isMenuKey({ key: "Enter", shiftKey: true })).toBe(false);
  });
});

describe("bookMenuItems", () => {
  it("lists Add to readlist, Change status and Open book, in that order", () => {
    expect(bookMenuItems().map((item) => item.kind)).toEqual([
      "addToReadlist",
      "changeStatus",
      "openBook",
    ]);
  });

  it("adds the page's own items after the standard ones, keeping their handlers", () => {
    const onSelect = vi.fn();
    const items = bookMenuItems([
      { label: "Remove from this readlist", onSelect },
    ]);
    expect(items).toHaveLength(4);
    const last = items[3];
    expect(last).toMatchObject({
      kind: "custom",
      label: "Remove from this readlist",
    });
    if (last.kind === "custom") last.onSelect();
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
