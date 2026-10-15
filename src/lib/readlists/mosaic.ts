import type { ReadlistSummary } from "./types";

/** The automatic cover mosaic (P19) is always a 2×2 grid. */
export const MOSAIC_CELLS = 4;

export type MosaicCell =
  /** A book with a stored or original cover image. */
  | { kind: "image"; title: string; coverUrl: string }
  /** A book without a cover: a generated cover with its title, like BookCover. */
  | { kind: "generated"; title: string }
  /** No book for this cell (a list with fewer than four books): a plain neutral tile. */
  | { kind: "empty" };

/**
 * The four cells of a readlist's mosaic, from its newest books (P40): books with a cover show it,
 * books without one get a generated cover, and missing books leave neutral tiles.
 */
export function mosaicCells(covers: ReadlistSummary["mosaic"]): MosaicCell[] {
  const cells: MosaicCell[] = covers
    .slice(0, MOSAIC_CELLS)
    .map(({ title, coverUrl }) =>
      coverUrl
        ? { kind: "image", title, coverUrl }
        : { kind: "generated", title },
    );
  while (cells.length < MOSAIC_CELLS) cells.push({ kind: "empty" });
  return cells;
}
