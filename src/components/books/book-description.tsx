"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/** Longer descriptions are cut to a few lines until "Read more" is tapped. */
const PREVIEW_LENGTH = 280;

/** "About this book" (D2) with a Read more / Show less toggle for long text. */
export function BookDescription({ text }: { text: string }) {
  const t = useTranslations("bookDetail");
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > PREVIEW_LENGTH || text.split("\n").length > 4;

  return (
    <div className="space-y-2">
      <p
        id={id}
        className={`leading-relaxed whitespace-pre-line ${long && !expanded ? "line-clamp-4" : ""}`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold underline underline-offset-4"
        >
          {expanded ? t("readLess") : t("readMore")}
        </button>
      )}
    </div>
  );
}
