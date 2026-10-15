import { describe, expect, it } from "vitest";

import {
  addBookCloseHref,
  isSearchable,
  manualEntryHref,
  manualEntryReadlist,
  manualEntryStatus,
  readSearchParams,
  safeReturnTo,
  searchHref,
  targetHref,
} from "./navigation";

const LIST = "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d10";

describe("readSearchParams", () => {
  it("reads the text and the filter", () => {
    expect(readSearchParams({ q: "austen", field: "title" })).toEqual({
      query: "austen",
      field: "title",
      target: null,
    });
  });

  it("defaults to no text and All", () => {
    expect(readSearchParams({})).toEqual({
      query: "",
      field: "all",
      target: null,
    });
  });

  it("falls back to All for an unknown filter", () => {
    expect(readSearchParams({ q: "emma", field: "isbn" }).field).toBe("all");
  });

  it("uses the first value when a parameter repeats", () => {
    expect(
      readSearchParams({ q: ["emma", "persuasion"], field: ["author", "x"] }),
    ).toEqual({ query: "emma", field: "author", target: null });
  });

  it("cuts very long text", () => {
    expect(readSearchParams({ q: "a".repeat(500) }).query).toHaveLength(200);
  });

  it("reads the shelf list the search came from (P45)", () => {
    expect(readSearchParams({ add: "reading" }).target).toEqual({
      kind: "status",
      status: "reading",
    });
    expect(readSearchParams({ add: "want-to-read" }).target).toEqual({
      kind: "status",
      status: "want_to_read",
    });
  });

  it("reads the readlist the search came from, before a shelf list", () => {
    expect(readSearchParams({ readlist: LIST, add: "read" }).target).toEqual({
      kind: "readlist",
      readlistId: LIST,
    });
  });

  it("ignores an unknown shelf list or an invalid readlist id", () => {
    expect(readSearchParams({ add: "reading_now" }).target).toBeNull();
    expect(readSearchParams({ readlist: "not-an-id" }).target).toBeNull();
  });
});

describe("targetHref", () => {
  it("goes back to the shelf list, the readlist, or Home", () => {
    expect(targetHref({ kind: "status", status: "want_to_read" })).toBe(
      "/books/shelf/want-to-read",
    );
    expect(targetHref({ kind: "readlist", readlistId: LIST })).toBe(
      `/readlists/${LIST}`,
    );
    expect(targetHref(null)).toBe("/");
  });
});

describe("isSearchable", () => {
  it("needs at least two characters", () => {
    expect(isSearchable("")).toBe(false);
    expect(isSearchable(" a ")).toBe(false);
    expect(isSearchable("ab")).toBe(true);
  });
});

describe("searchHref", () => {
  it("leaves out the defaults", () => {
    expect(searchHref("")).toBe("/books/search");
    expect(searchHref("  ", "all")).toBe("/books/search");
  });

  it("keeps the text and a filter", () => {
    expect(searchHref(" jane austen ", "author")).toBe(
      "/books/search?q=jane+austen&field=author",
    );
    expect(searchHref("", "title")).toBe("/books/search?field=title");
  });

  it("encodes special characters", () => {
    expect(searchHref("Tom & Jerry?")).toBe("/books/search?q=Tom+%26+Jerry%3F");
  });

  it("keeps the target", () => {
    expect(searchHref("", "all", { kind: "status", status: "reading" })).toBe(
      "/books/search?add=reading",
    );
    expect(
      searchHref("emma", "title", { kind: "readlist", readlistId: LIST }),
    ).toBe(`/books/search?q=emma&field=title&readlist=${LIST}`);
  });
});

describe("manualEntryHref", () => {
  it("copies the search text into the title", () => {
    expect(manualEntryHref("The Hobbit")).toBe("/books/new?title=The+Hobbit");
  });

  it("works without text", () => {
    expect(manualEntryHref(" ")).toBe("/books/new");
  });

  it("passes returnTo on", () => {
    expect(manualEntryHref("Emma", "/onboarding/currently-reading")).toBe(
      "/books/new?title=Emma&returnTo=%2Fonboarding%2Fcurrently-reading",
    );
  });
});

describe("safeReturnTo", () => {
  it("allows same-site paths", () => {
    expect(safeReturnTo("/onboarding/currently-reading")).toBe(
      "/onboarding/currently-reading",
    );
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "",
    undefined,
    ["/"],
  ])("rejects %s", (value) => {
    expect(safeReturnTo(value)).toBeNull();
  });
});

describe("manual entry from a target (P45)", () => {
  it("passes the status or the readlist on", () => {
    expect(
      manualEntryHref("Emma", null, { kind: "status", status: "read" }),
    ).toBe("/books/new?title=Emma&status=read");
    expect(
      manualEntryHref("", null, { kind: "readlist", readlistId: LIST }),
    ).toBe(`/books/new?readlist=${LIST}`);
  });

  it("reads them back, with Want to read and no readlist as defaults", () => {
    expect(manualEntryStatus("reading")).toBe("reading");
    expect(manualEntryStatus("finished")).toBe("want_to_read");
    expect(manualEntryStatus(undefined)).toBe("want_to_read");
    expect(manualEntryReadlist(LIST)).toBe(LIST);
    expect(manualEntryReadlist("x")).toBeNull();
  });

  it("goes back to the search with the same target", () => {
    expect(
      addBookCloseHref(null, "Emma", { kind: "status", status: "reading" }),
    ).toBe("/books/search?q=Emma&add=reading");
  });
});

describe("addBookCloseHref", () => {
  it("goes back to returnTo", () => {
    expect(addBookCloseHref("/onboarding/currently-reading", "Emma")).toBe(
      "/onboarding/currently-reading",
    );
  });

  it("otherwise goes back to the search for the title", () => {
    expect(addBookCloseHref(null, "Emma")).toBe("/books/search?q=Emma");
    expect(addBookCloseHref(null, "")).toBe("/books/search");
  });

  it("ignores an unsafe returnTo", () => {
    expect(addBookCloseHref("//evil.example", "")).toBe("/books/search");
  });
});
