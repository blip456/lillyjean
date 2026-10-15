import { describe, expect, it } from "vitest";

import {
  editReadlistHref,
  newReadlistHref,
  readlistHref,
  readNewReadlistParams,
} from "./links";

const BOOK = "0b6f1c1e-7d4f-4c1a-9a43-1f2a3b4c5d6e";

describe("readlist URLs", () => {
  it("builds the detail and edit paths", () => {
    expect(readlistHref("abc")).toBe("/readlists/abc");
    expect(editReadlistHref("abc")).toBe("/readlists/abc/edit");
  });

  it("builds /readlists/new with only the parts that are given", () => {
    expect(newReadlistHref()).toBe("/readlists/new");
    expect(newReadlistHref({ bookId: BOOK, returnTo: `/books/${BOOK}` })).toBe(
      `/readlists/new?bookId=${BOOK}&returnTo=%2Fbooks%2F${BOOK}`,
    );
  });

  it("drops a returnTo that leaves the site", () => {
    expect(newReadlistHref({ returnTo: "https://evil.test" })).toBe(
      "/readlists/new",
    );
    expect(newReadlistHref({ returnTo: "//evil.test" })).toBe("/readlists/new");
  });
});

describe("readNewReadlistParams", () => {
  it("keeps a valid book id and a same-site path", () => {
    expect(
      readNewReadlistParams({ bookId: BOOK, returnTo: "/books/search?q=a" }),
    ).toEqual({ bookId: BOOK, returnTo: "/books/search?q=a" });
  });

  it("ignores invalid book ids and other websites", () => {
    expect(
      readNewReadlistParams({ bookId: "1; drop", returnTo: "//evil.test" }),
    ).toEqual({ bookId: null, returnTo: null });
    expect(
      readNewReadlistParams({ returnTo: "/\\evil.test", bookId: undefined }),
    ).toEqual({ bookId: null, returnTo: null });
    expect(
      readNewReadlistParams({ returnTo: "https://evil.test/path" }),
    ).toEqual({ bookId: null, returnTo: null });
  });

  it("takes the first value of repeated parameters", () => {
    expect(
      readNewReadlistParams({ bookId: [BOOK, "x"], returnTo: ["/", "//x"] }),
    ).toEqual({ bookId: BOOK, returnTo: "/" });
  });
});
