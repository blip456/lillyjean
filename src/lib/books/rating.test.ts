import { describe, expect, it } from "vitest";

import { ratingStars } from "./rating";

const draw = (rating: number) =>
  ratingStars(rating)
    .map((star) => ({ full: "★", half: "½", empty: "☆" })[star])
    .join("");

describe("ratingStars", () => {
  it.each([
    [4.3, "★★★★½"],
    [4.1, "★★★★☆"],
    [4.75, "★★★★★"],
    [3.5, "★★★½☆"],
    [0, "☆☆☆☆☆"],
    [5, "★★★★★"],
  ])("draws %s as %s", (rating, stars) => {
    expect(draw(rating)).toBe(stars);
  });

  it("clamps values outside 0–5", () => {
    expect(draw(7)).toBe("★★★★★");
    expect(draw(-1)).toBe("☆☆☆☆☆");
  });
});
