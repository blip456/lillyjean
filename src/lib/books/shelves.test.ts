import { describe, expect, it } from "vitest";

import { shelfHref, shelfStatus } from "./shelves";
import { BOOK_STATUSES } from "./types";

describe("shelf slugs", () => {
  it("maps the three shelf URLs to statuses", () => {
    expect(shelfStatus("want-to-read")).toBe("want_to_read");
    expect(shelfStatus("reading")).toBe("reading");
    expect(shelfStatus("read")).toBe("read");
  });

  it("rejects anything else", () => {
    for (const slug of ["want_to_read", "Reading", "toString", "", "all"])
      expect(shelfStatus(slug)).toBeNull();
  });

  it("links back to the same shelf", () => {
    for (const status of BOOK_STATUSES)
      expect(shelfStatus(shelfHref(status).split("/").pop()!)).toBe(status);
  });
});
