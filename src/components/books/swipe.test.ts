import { describe, expect, it } from "vitest";

import {
  ACTION_WIDTH,
  commitDistance,
  decideSwipe,
  dragOffset,
  swipeIntent,
  velocityOf,
} from "./swipe";

const layout = { revealWidth: ACTION_WIDTH * 3, rowWidth: 342 };

describe("swipeIntent", () => {
  it("waits until the finger moved a few pixels", () => {
    expect(swipeIntent(3, 2)).toBeNull();
  });

  it("takes over clearly sideways movement", () => {
    expect(swipeIntent(-20, 4)).toBe("horizontal");
    expect(swipeIntent(15, -3)).toBe("horizontal");
  });

  it("leaves vertical and diagonal movement to the browser (scrolling)", () => {
    expect(swipeIntent(2, 20)).toBe("vertical");
    expect(swipeIntent(-12, 11)).toBe("vertical");
  });
});

describe("dragOffset", () => {
  it("follows the finger to the left", () => {
    expect(dragOffset(0, -100, layout)).toBe(-100);
    expect(dragOffset(-228, -50, layout)).toBe(-278);
  });

  it("resists being pulled right past the closed position", () => {
    expect(dragOffset(0, 80, layout)).toBe(20);
  });

  it("resists going further than the row width", () => {
    expect(dragOffset(0, -442, layout)).toBe(-367);
  });
});

describe("commitDistance", () => {
  it("is well past the revealed buttons and most of the row", () => {
    expect(commitDistance(layout)).toBeGreaterThan(layout.revealWidth);
    expect(commitDistance(layout)).toBe(256);
    expect(commitDistance({ revealWidth: 216, rowWidth: 500 })).toBe(350);
  });
});

describe("decideSwipe", () => {
  it("closes after a short, slow drag", () => {
    expect(decideSwipe(-60, -0.1, layout)).toBe("closed");
  });

  it("opens after dragging more than half of the buttons", () => {
    expect(decideSwipe(-130, 0, layout)).toBe("open");
  });

  it("opens on a quick flick to the left, even when short", () => {
    expect(decideSwipe(-30, -0.8, layout)).toBe("open");
  });

  it("closes on a quick flick to the right, even when open", () => {
    expect(decideSwipe(-200, 0.6, layout)).toBe("closed");
  });

  it("applies the next status after a long swipe", () => {
    expect(decideSwipe(-260, 0, layout)).toBe("commit");
    expect(decideSwipe(-300, 0.9, layout)).toBe("commit");
  });

  it("never applies a status on a quick but short flick", () => {
    expect(decideSwipe(-120, -3, layout)).toBe("open");
  });
});

describe("velocityOf", () => {
  it("is zero without movement", () => {
    expect(velocityOf([])).toBe(0);
    expect(velocityOf([{ x: 10, t: 0 }])).toBe(0);
  });

  it("measures the last 100 ms", () => {
    const samples = [
      { x: 0, t: 0 },
      { x: -10, t: 200 },
      { x: -50, t: 250 },
      { x: -110, t: 300 },
    ];
    expect(velocityOf(samples)).toBeCloseTo(-1);
  });

  it("is low when the finger paused before letting go", () => {
    expect(
      velocityOf([
        { x: 0, t: 0 },
        { x: -100, t: 50 },
        { x: -100, t: 400 },
      ]),
    ).toBe(0);
  });
});
