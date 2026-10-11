import { afterEach, describe, expect, it, vi } from "vitest";

import { googleQuery, googleRatingQuery, mapGoogleSearch } from "./google";
import {
  BookSearchUnavailableError,
  fetchBookDetails,
  searchExternalBooks,
} from "./index";
import {
  mapOpenLibrarySearch,
  mapOpenLibraryWork,
  openLibrarySearchUrl,
} from "./openlibrary";

const openLibraryResponse = {
  numFound: 2,
  docs: [
    {
      key: "/works/OL66554W",
      title: "Pride and Prejudice",
      author_name: ["Jane Austen"],
      cover_i: 14348537,
      first_publish_year: 1813,
      isbn: ["0141439513", "9780141439518"],
    },
    { key: "/books/OL1M", title: "An edition, not a work" },
    { key: "/works/OL2W" },
  ],
};

const googleResponse = {
  items: [
    {
      id: "s1gVAAAAYAAJ",
      volumeInfo: {
        title: "Pride and Prejudice",
        authors: ["Jane Austen"],
        description: "<p>A classic.</p>",
        imageLinks: {
          thumbnail:
            "http://books.google.com/books/content?id=s1gVAAAAYAAJ&printsec=frontcover&img=1&zoom=1&edge=curl",
        },
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0141439513" },
          { type: "ISBN_13", identifier: "9780141439518" },
        ],
        publishedDate: "2002-12-31",
        averageRating: 4.3,
        ratingsCount: 2215,
      },
    },
    { id: "bad id with spaces", volumeInfo: { title: "Skipped" } },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Open Library", () => {
  it("builds the search URL per field and for ISBNs", () => {
    const params = (url: string) => new URL(url).searchParams;
    expect(params(openLibrarySearchUrl("austen", "all")).get("q")).toBe(
      "austen",
    );
    expect(params(openLibrarySearchUrl("emma", "title")).get("title")).toBe(
      "emma",
    );
    expect(params(openLibrarySearchUrl("austen", "author")).get("author")).toBe(
      "austen",
    );
    expect(
      params(openLibrarySearchUrl("978-0141439518", "title")).get("isbn"),
    ).toBe("9780141439518");
  });

  it("maps works and skips editions and untitled results", () => {
    expect(mapOpenLibrarySearch(openLibraryResponse)).toEqual([
      {
        source: "openlibrary",
        sourceId: "OL66554W",
        title: "Pride and Prejudice",
        authors: ["Jane Austen"],
        description: null,
        coverUrl: "https://covers.openlibrary.org/b/id/14348537-M.jpg",
        isbn: null,
        publishedYear: 1813,
        googleRating: null,
        googleRatingsCount: null,
      },
    ]);
    expect(mapOpenLibrarySearch({})).toEqual([]);
  });

  it("reads the description in both shapes", () => {
    expect(mapOpenLibraryWork({ description: "Plain" }).description).toBe(
      "Plain",
    );
    expect(
      mapOpenLibraryWork({
        description: { type: "/type/text", value: "Typed" },
        covers: [-1, 42],
      }),
    ).toEqual({
      description: "Typed",
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
    });
  });
});

describe("Google Books", () => {
  it("builds queries per field and escapes the query syntax", () => {
    expect(googleQuery("emma", "title")).toBe("intitle:emma");
    expect(googleQuery('jane "austen"', "author")).toBe("inauthor:jane austen");
    expect(googleQuery("0141439513", "all")).toBe("isbn:0141439513");
    expect(
      googleRatingQuery({
        isbn: null,
        title: "Emma",
        authors: ["Jane Austen"],
      }),
    ).toBe("intitle:Emma inauthor:Jane Austen");
  });

  it("maps volumes with rating, https cover and ISBN-13", () => {
    expect(mapGoogleSearch(googleResponse)).toEqual([
      {
        source: "google",
        sourceId: "s1gVAAAAYAAJ",
        title: "Pride and Prejudice",
        authors: ["Jane Austen"],
        description: "A classic.",
        coverUrl:
          "https://books.google.com/books/content?id=s1gVAAAAYAAJ&printsec=frontcover&img=1&zoom=1",
        isbn: "9780141439518",
        publishedYear: 2002,
        googleRating: 4.3,
        googleRatingsCount: 2215,
      },
    ]);
  });
});

describe("searchExternalBooks", () => {
  it("uses Open Library when it has results", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetch);
    const books = await searchExternalBooks("pride", "all");
    expect(books.map((b) => b.source)).toEqual(["openlibrary"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to Google Books when Open Library fails", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(googleResponse));
    vi.stubGlobal("fetch", fetch);
    const books = await searchExternalBooks("pride", "all");
    expect(books.map((b) => b.source)).toEqual(["google"]);
    expect(String(fetch.mock.calls[1][0])).toContain("googleapis.com");
  });

  it("falls back to Google Books when Open Library finds nothing", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ docs: [] }))
      .mockResolvedValueOnce(jsonResponse(googleResponse));
    vi.stubGlobal("fetch", fetch);
    expect(await searchExternalBooks("pride", "all")).toHaveLength(1);
  });

  it("retries Open Library once after a network error", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("connection reset"))
      .mockResolvedValueOnce(jsonResponse(openLibraryResponse));
    vi.stubGlobal("fetch", fetch);
    const books = await searchExternalBooks("pride", "all");
    expect(books.map((b) => b.source)).toEqual(["openlibrary"]);
    expect(String(fetch.mock.calls[1][0])).toContain("openlibrary.org");
  });

  it("keeps the ISBN only when the search was an ISBN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(openLibraryResponse)),
    );
    expect((await searchExternalBooks("pride", "all"))[0].isbn).toBeNull();
    expect(
      (await searchExternalBooks("978-0-14-143951-8", "all"))[0].isbn,
    ).toBe("9780141439518");
  });

  it("sends the Google API key when configured", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ docs: [] }))
      .mockResolvedValueOnce(jsonResponse(googleResponse));
    vi.stubGlobal("fetch", fetch);
    await searchExternalBooks("pride", "all");
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get("key")).toBe(
      "test-key",
    );
  });

  it("reports unavailable only when both databases fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network down")),
    );
    await expect(searchExternalBooks("pride", "all")).rejects.toBeInstanceOf(
      BookSearchUnavailableError,
    );
  });

  it("uses offline data with BOOKS_API=fixtures", async () => {
    vi.stubEnv("BOOKS_API", "fixtures");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const books = await searchExternalBooks("austen", "author");
    expect(books.map((b) => b.title)).toEqual([
      "Pride and Prejudice",
      "Emma",
      "Persuasion",
    ]);
    expect(await searchExternalBooks("bronte", "all")).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("fetchBookDetails", () => {
  it("combines the Open Library description with the Google rating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("openlibrary.org")
          ? jsonResponse({ description: { value: "From the work." } })
          : jsonResponse(googleResponse),
      ),
    );
    const details = await fetchBookDetails({
      source: "openlibrary",
      sourceId: "OL66554W",
      title: "Pride and Prejudice",
      authors: ["Jane Austen"],
      isbn: "9780141439518",
    });
    expect(details.description).toBe("From the work.");
    expect(details.googleRating).toBe(4.3);
  });

  it("never throws when the lookups fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const details = await fetchBookDetails({
      source: "google",
      sourceId: "abc",
      title: "T",
      authors: [],
      isbn: null,
    });
    expect(details).toEqual({
      description: null,
      googleRating: null,
      googleRatingsCount: null,
      coverUrl: null,
      isbn: null,
    });
  });
});
