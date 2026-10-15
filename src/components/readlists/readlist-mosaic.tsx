import { coverTone } from "@/components/books/book-cover";
import { mosaicCells } from "@/lib/readlists/mosaic";
import type { ReadlistSummary } from "@/lib/readlists/types";

/** Where the mosaic is shown: a tile on C1 (fills its column), the Home row, the C2 header. */
const sizes = {
  tile: { frame: "w-full rounded-2xl", text: "text-[0.625rem] p-1.5" },
  row: { frame: "w-28 rounded-xl", text: "text-[0.5rem] p-1" },
  header: { frame: "w-32 rounded-2xl", text: "text-[0.5625rem] p-1.5" },
} as const;

type ReadlistMosaicProps = {
  covers: ReadlistSummary["mosaic"];
  size: keyof typeof sizes;
  className?: string;
};

/**
 * The automatic 2×2 cover mosaic of a readlist (P19) from its four newest books (P40). Books
 * without a cover get a generated cover (same tone as BookCover); a list with fewer than four
 * books shows neutral tiles. Decorative: the readlist's name next to it carries the meaning.
 */
export function ReadlistMosaic({
  covers,
  size,
  className = "",
}: ReadlistMosaicProps) {
  const { frame, text } = sizes[size];

  return (
    <span
      aria-hidden="true"
      data-mosaic=""
      className={`grid aspect-square shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden border border-border bg-border ${frame} ${className}`}
    >
      {mosaicCells(covers).map((cell, index) => {
        if (cell.kind === "image")
          return (
            // Covers come from many hosts and sizes and are already stored copies (T20); like
            // BookCover, the browser loads them directly instead of through image optimisation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={cell.coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-full min-h-0 bg-border object-cover"
            />
          );
        if (cell.kind === "generated")
          return (
            <span
              key={index}
              className={`flex size-full min-h-0 items-center justify-center overflow-hidden text-center font-serif leading-tight font-semibold ${text} ${coverTone(cell.title)}`}
            >
              <span className="line-clamp-3 break-words">{cell.title}</span>
            </span>
          );
        return <span key={index} className="size-full bg-surface" />;
      })}
    </span>
  );
}
