import { describe, expect, it } from "vitest";

import {
  addBookCloseHref,
  isSearchable,
  manualEntryHref,
  readSearchParams,
  safeReturnTo,
  searchHref,
} from "./navigation";

describe("readSearchParams", () => {
  it("reads the text and the filter", () => {
    expect(readSearchParams({ q: "austen", field: "title" })).toEqual({
      query: "austen",
      field: "title",
    });
  });

  it("defaults to no text and All", () => {
    expect(readSearchParams({})).toEqual({ query: "", field: "all" });
  });

  it("falls back to All for an unknown filter", () => {
    expect(readSearchParams({ q: "emma", field: "isbn" }).field).toBe("all");
  });

  it("uses the first value when a parameter repeats", () => {
    expect(
      readSearchParams({ q: ["emma", "persuasion"], field: ["author", "x"] }),
    ).toEqual({ query: "emma", field: "author" });
  });

  it("cuts very long text", () => {
    expect(readSearchParams({ q: "a".repeat(500) }).query).toHaveLength(200);
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
