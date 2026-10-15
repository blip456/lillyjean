import type { ReadlistSummary } from "./types";

/**
 * Selection state of the add-to-readlist sheet (C4), unit tested in selection.test.ts.
 *
 * Ticks save at once: `selected` is what the sheet shows (optimistic), `saved` what the server
 * confirmed. A failed save puts the tick back to the saved value, unless a newer tick on the
 * same readlist is already on its way.
 */
export type ReadlistSelection = {
  readlists: ReadlistSummary[];
  /** Ticked in the sheet now. */
  selected: string[];
  /** Confirmed by the server. */
  saved: string[];
  /** Contained the book when the sheet opened; the book counts are relative to this. */
  initial: string[];
};

export function initialSelection(
  readlists: ReadlistSummary[],
  selectedIds: string[],
): ReadlistSelection {
  const known = new Set(readlists.map((list) => list.id));
  const ids = selectedIds.filter((id) => known.has(id));
  return { readlists, selected: ids, saved: ids, initial: ids };
}

/** `ids` with `id` ticked or not; the order of the other ids is kept. */
export function setTicked(ids: string[], id: string, ticked: boolean) {
  const without = ids.filter((other) => other !== id);
  return ticked ? [...without, id] : without;
}

/** A tick or untick by the reader: shown at once. */
export function tick(
  state: ReadlistSelection,
  id: string,
  ticked: boolean,
): ReadlistSelection {
  return { ...state, selected: setTicked(state.selected, id, ticked) };
}

/**
 * The server answered a tick. `latest` is false when the reader changed the same readlist
 * again in the meantime; that newer change then decides what is shown.
 */
export function settle(
  state: ReadlistSelection,
  id: string,
  ticked: boolean,
  ok: boolean,
  latest: boolean,
): ReadlistSelection {
  const saved = ok ? setTicked(state.saved, id, ticked) : state.saved;
  const selected =
    ok || !latest
      ? state.selected
      : setTicked(state.selected, id, saved.includes(id));
  return { ...state, saved, selected };
}

/** A readlist made with "New readlist": first in the list and ticked (it holds the book). */
export function addCreated(
  state: ReadlistSelection,
  created: ReadlistSummary,
): ReadlistSelection {
  const tickedWith = (ids: string[]) => setTicked(ids, created.id, true);
  return {
    readlists: [
      created,
      ...state.readlists.filter((list) => list.id !== created.id),
    ],
    selected: tickedWith(state.selected),
    saved: tickedWith(state.saved),
    initial: tickedWith(state.initial),
  };
}

/** Book count shown for a readlist, including the ticks made in this sheet. */
export function shownBookCount(
  list: Pick<ReadlistSummary, "id" | "bookCount">,
  state: Pick<ReadlistSelection, "selected" | "initial">,
): number {
  const was = state.initial.includes(list.id) ? 1 : 0;
  const is = state.selected.includes(list.id) ? 1 : 0;
  return Math.max(0, list.bookCount - was + is);
}
