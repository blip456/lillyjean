import { describe, expect, it } from "vitest";

import {
  addCreated,
  initialSelection,
  settle,
  setTicked,
  shownBookCount,
  tick,
} from "./selection";
import type { ReadlistSummary } from "./types";

const list = (id: string, bookCount = 0): ReadlistSummary => ({
  id,
  name: `List ${id}`,
  description: null,
  bookCount,
  mosaic: [],
  updatedAt: "2026-10-15T10:00:00Z",
});

const lists = [list("a", 3), list("b", 1), list("c", 0)];

describe("initialSelection", () => {
  it("ticks the readlists that contain the book", () => {
    const state = initialSelection(lists, ["b"]);
    expect(state.selected).toEqual(["b"]);
    expect(state.saved).toEqual(["b"]);
    expect(state.initial).toEqual(["b"]);
  });

  it("ignores ids of readlists that are not listed", () => {
    expect(initialSelection(lists, ["b", "zz"]).selected).toEqual(["b"]);
  });
});

describe("setTicked", () => {
  it("adds and removes an id without duplicates", () => {
    expect(setTicked(["a"], "b", true)).toEqual(["a", "b"]);
    expect(setTicked(["a", "b"], "b", true)).toEqual(["a", "b"]);
    expect(setTicked(["a", "b"], "a", false)).toEqual(["b"]);
    expect(setTicked([], "a", false)).toEqual([]);
  });
});

describe("tick and settle", () => {
  it("shows a tick at once and keeps it when the server confirms", () => {
    let state = tick(initialSelection(lists, []), "a", true);
    expect(state.selected).toEqual(["a"]);
    expect(state.saved).toEqual([]);
    state = settle(state, "a", true, true, true);
    expect(state.selected).toEqual(["a"]);
    expect(state.saved).toEqual(["a"]);
  });

  it("rolls a failed tick back to what the server has", () => {
    let state = tick(initialSelection(lists, ["b"]), "b", false);
    expect(state.selected).toEqual([]);
    state = settle(state, "b", false, false, true);
    expect(state.selected).toEqual(["b"]);
    expect(state.saved).toEqual(["b"]);
  });

  it("does not undo a newer tick when an older one fails", () => {
    let state = initialSelection(lists, []);
    state = tick(state, "a", true);
    state = tick(state, "a", false);
    state = settle(state, "a", true, false, false);
    expect(state.selected).toEqual([]);
    state = settle(state, "a", false, true, true);
    expect(state.selected).toEqual([]);
    expect(state.saved).toEqual([]);
  });

  it("rolls the latest failed tick back to the last confirmed value", () => {
    let state = initialSelection(lists, []);
    state = tick(state, "a", true);
    state = settle(state, "a", true, true, false);
    state = tick(state, "a", false);
    state = settle(state, "a", false, false, true);
    expect(state.selected).toEqual(["a"]);
  });
});

describe("addCreated", () => {
  it("puts the new readlist first, ticked and counted as already holding the book", () => {
    const state = addCreated(initialSelection(lists, ["c"]), list("new", 1));
    expect(state.readlists.map((l) => l.id)).toEqual(["new", "a", "b", "c"]);
    expect(state.selected).toContain("new");
    expect(state.saved).toContain("new");
    expect(shownBookCount(state.readlists[0], state)).toBe(1);
  });
});

describe("shownBookCount", () => {
  it("counts ticks made in the sheet", () => {
    let state = initialSelection(lists, ["b"]);
    expect(shownBookCount(lists[0], state)).toBe(3);
    expect(shownBookCount(lists[1], state)).toBe(1);
    state = tick(tick(state, "a", true), "b", false);
    expect(shownBookCount(lists[0], state)).toBe(4);
    expect(shownBookCount(lists[1], state)).toBe(0);
  });
});
