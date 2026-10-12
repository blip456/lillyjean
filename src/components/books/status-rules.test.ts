import { describe, expect, it } from "vitest";

import {
  applyChange,
  type BookState,
  isSameState,
  nextStatus,
  previousStateOf,
  snackbarMessageFor,
  stateOf,
} from "./status-rules";

const none: BookState = { status: null, progress: null, readCount: 0 };
const want: BookState = {
  status: "want_to_read",
  progress: null,
  readCount: 0,
};
const reading: BookState = { status: "reading", progress: 40, readCount: 0 };
const read: BookState = { status: "read", progress: null, readCount: 2 };

describe("nextStatus (long swipe, B4)", () => {
  it("goes no status → Want to read → Reading → Read", () => {
    expect(nextStatus(null)).toBe("want_to_read");
    expect(nextStatus("want_to_read")).toBe("reading");
    expect(nextStatus("reading")).toBe("read");
  });

  it("keeps a read book on Read, which opens D4 for a re-read", () => {
    expect(nextStatus("read")).toBe("read");
  });
});

describe("stateOf", () => {
  it("drops a stray percentage on books that are not being read", () => {
    expect(
      stateOf({ status: "want_to_read", progress: 30, readCount: 0 }),
    ).toEqual(want);
    expect(stateOf(reading)).toEqual(reading);
  });
});

describe("previousStateOf (what Undo restores)", () => {
  it("is null for a book that was not on the shelf", () => {
    expect(previousStateOf(none)).toBeNull();
  });

  it("keeps the status and the percentage", () => {
    expect(previousStateOf(reading)).toEqual({
      status: "reading",
      progress: 40,
    });
    expect(previousStateOf(read)).toEqual({ status: "read", progress: null });
  });
});

describe("applyChange (optimistic state)", () => {
  it("sets Reading with a percentage", () => {
    expect(
      applyChange(want, { kind: "status", status: "reading", progress: 40 }),
    ).toEqual({ status: "reading", progress: 40, readCount: 0 });
  });

  it("clears the percentage when moving away from Reading", () => {
    expect(
      applyChange(reading, {
        kind: "status",
        status: "want_to_read",
        progress: 40,
      }),
    ).toEqual(want);
  });

  it("adds a read when marking as read, also for re-reads", () => {
    expect(applyChange(reading, { kind: "read" })).toEqual({
      status: "read",
      progress: null,
      readCount: 1,
    });
    expect(applyChange(read, { kind: "read" }).readCount).toBe(3);
  });

  it("removes the status and the reads (P38)", () => {
    expect(applyChange(read, { kind: "remove" })).toEqual(none);
  });
});

describe("isSameState", () => {
  it("is true when nothing changes", () => {
    expect(isSameState(want, "want_to_read", null)).toBe(true);
    expect(isSameState(want, "want_to_read", 50)).toBe(true);
    expect(isSameState(reading, "reading", 40)).toBe(true);
  });

  it("is false for a new status or percentage", () => {
    expect(isSameState(want, "reading", null)).toBe(false);
    expect(isSameState(reading, "reading", null)).toBe(false);
    expect(isSameState(reading, "reading", 41)).toBe(false);
    expect(isSameState(none, "want_to_read", null)).toBe(false);
  });
});

describe("snackbarMessageFor", () => {
  it("says where the book moved", () => {
    expect(
      snackbarMessageFor(want, {
        kind: "status",
        status: "reading",
        progress: null,
      }),
    ).toEqual({ key: "movedTo", status: "reading" });
  });

  it("says the progress was saved when only the percentage changed", () => {
    expect(
      snackbarMessageFor(reading, {
        kind: "status",
        status: "reading",
        progress: 60,
      }),
    ).toEqual({ key: "progressSaved" });
  });

  it("tells a first read from a re-read", () => {
    expect(snackbarMessageFor(reading, { kind: "read" })).toEqual({
      key: "markedRead",
    });
    expect(snackbarMessageFor(read, { kind: "read" })).toEqual({
      key: "markedReadAgain",
    });
  });

  it("confirms a removal", () => {
    expect(snackbarMessageFor(read, { kind: "remove" })).toEqual({
      key: "removed",
    });
  });
});
