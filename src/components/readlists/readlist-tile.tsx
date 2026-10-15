import { useTranslations } from "next-intl";

import { Link } from "@/components/ui/link";
import { readlistHref } from "@/lib/readlists/links";
import type { ReadlistSummary } from "@/lib/readlists/types";

import { ReadlistMosaic } from "./readlist-mosaic";

type ReadlistTileProps = {
  readlist: ReadlistSummary;
  /** `tile`: the two-column grid on C1; `row`: the horizontal row on Home (B1). */
  size: "tile" | "row";
};

/** A readlist as a tile: cover mosaic, name and number of books; opens the readlist (C2). */
export function ReadlistTile({ readlist, size }: ReadlistTileProps) {
  const t = useTranslations("readlists");

  return (
    <Link
      href={readlistHref(readlist.id)}
      className={`block rounded-2xl focus-visible:outline-offset-4 ${size === "row" ? "w-28" : "w-full"}`}
    >
      <ReadlistMosaic covers={readlist.mosaic} size={size} />
      <span
        className={`mt-2 block font-semibold break-words ${size === "row" ? "line-clamp-2 text-sm" : "line-clamp-2"}`}
      >
        {readlist.name}
      </span>
      <span className="block text-sm text-muted">
        {t("bookCount", { count: readlist.bookCount })}
      </span>
    </Link>
  );
}

/** The last tile: "+ New" / "New readlist" → C3. Same shape as a readlist tile. */
export function NewReadlistTile({
  size,
  label,
  accessibleLabel,
}: {
  size: "tile" | "row";
  label: string;
  /** Full name for screen readers when the visible label is short ("+ New"). */
  accessibleLabel?: string;
}) {
  return (
    <Link
      href="/readlists/new"
      aria-label={accessibleLabel}
      className={`flex aspect-square flex-col items-center justify-center gap-1 border-2 border-dashed border-border text-center font-semibold text-muted hover:bg-border/30 hover:text-foreground focus-visible:outline-offset-4 ${
        size === "row" ? "w-28 rounded-xl text-sm" : "w-full rounded-2xl"
      }`}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        +
      </span>
      <span>{label}</span>
    </Link>
  );
}
