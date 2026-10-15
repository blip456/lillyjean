import { describe, expect, it } from "vitest";

import { EDGE, startsAtEdge } from "./native-gestures";

describe("startsAtEdge", () => {
  it("catches touches in the left and right edge strips", () => {
    expect(startsAtEdge(0, 390)).toBe(true);
    expect(startsAtEdge(EDGE - 1, 390)).toBe(true);
    expect(startsAtEdge(390 - EDGE + 1, 390)).toBe(true);
  });

  it("leaves the rest of the screen alone", () => {
    expect(startsAtEdge(EDGE, 390)).toBe(false);
    expect(startsAtEdge(195, 390)).toBe(false);
    expect(startsAtEdge(390 - EDGE, 390)).toBe(false);
  });
});
