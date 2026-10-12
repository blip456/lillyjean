import { useFormatter, useTranslations } from "next-intl";

import { ratingStars } from "@/lib/books/rating";

/** A rating out of 5 as stars (half stars, P17) plus the number, e.g. ★★★★½ 4.3. */
export function RatingStars({ rating }: { rating: number }) {
  const t = useTranslations("bookDetail");
  const format = useFormatter();
  const value = format.number(rating, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex text-base leading-none">
        {ratingStars(rating).map((star, i) => (
          <span key={i} className="relative inline-block">
            <span className="text-border">★</span>
            {star !== "empty" && (
              <span
                className={`absolute inset-y-0 left-0 overflow-hidden text-foreground ${star === "half" ? "w-1/2" : "w-full"}`}
              >
                ★
              </span>
            )}
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
        {value}
      </span>
      <span className="sr-only">{t("ratingOutOf", { rating: value })}</span>
    </span>
  );
}
