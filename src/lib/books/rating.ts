export type Star = "full" | "half" | "empty";

/**
 * Stars for a rating out of 5, rounded to the nearest half star (P17), e.g. 4.3 → ★★★★½ and
 * 4.1 → ★★★★☆. Values outside 0–5 are clamped.
 */
export function ratingStars(rating: number, max = 5): Star[] {
  const halves = Math.round(Math.min(max, Math.max(0, rating)) * 2);
  return Array.from({ length: max }, (_, i) => {
    const left = halves - i * 2;
    if (left >= 2) return "full";
    if (left === 1) return "half";
    return "empty";
  });
}
