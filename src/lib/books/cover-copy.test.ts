import { describe, expect, it, vi } from "vitest";

import {
  copyCover,
  COVER_PATH_PATTERN,
  coverPathFor,
  type CoverStore,
  downloadCover,
  imageDimensions,
  isAllowedCoverSource,
  isLocalSupabase,
  mapLimited,
  MAX_COVER_BYTES,
  needsCoverCopy,
  sniffImageFormat,
  supabaseCoverStore,
} from "./cover-copy";

const BOOK_ID = "0b6f5c1e-2a3d-4e5f-8a9b-0c1d2e3f4a5b";
const OL_URL = "https://covers.openlibrary.org/b/id/12345-M.jpg";
const ARCHIVE_URL =
  "https://ia800100.us.archive.org/view_archive.php?archive=x.zip&file=12345-M.jpg";

/** A minimal JPEG: SOI, an APP0 segment, a SOF0 frame header, then padding. */
function fakeJpeg(width = 180, height = 270, size = 4000) {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 0);
  bytes.set([0x4a, 0x46, 0x49, 0x46, 0x00], 6);
  const sof = 2 + 2 + 16;
  bytes.set(
    [
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      height >> 8,
      height & 0xff,
      width >> 8,
      width & 0xff,
      0x03,
    ],
    sof,
  );
  return bytes;
}

function fakePng(width: number, height: number, size = 4000) {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function fakeGif(width: number, height: number, size = 43) {
  const bytes = new Uint8Array(size);
  bytes.set([...new TextEncoder().encode("GIF89a")], 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return bytes;
}

function fakeWebp(size = 4000) {
  const bytes = new Uint8Array(size);
  bytes.set([...new TextEncoder().encode("RIFF")], 0);
  bytes.set([...new TextEncoder().encode("WEBPVP8 ")], 8);
  return bytes;
}

function imageResponse(
  bytes: Uint8Array,
  type = "image/jpeg",
  headers: Record<string, string> = {},
) {
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: { "content-type": type, ...headers },
  });
}

/** A fetch that answers from a map of URL → response factory. */
function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const route = routes[url];
    return route ? route() : new Response("not found", { status: 404 });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function memoryStore() {
  const uploads: { path: string; bytes: Uint8Array; contentType: string }[] =
    [];
  const paths = new Map<string, string>();
  const store: CoverStore = {
    upload: vi.fn(async (path, bytes, contentType) => {
      uploads.push({ path, bytes, contentType });
    }),
    setCoverPath: vi.fn(async (id, path) => {
      paths.set(id, path);
    }),
  };
  return { store, uploads, paths };
}

describe("coverPathFor", () => {
  it("uses the book uuid and the image extension, matching the DB check", () => {
    expect(coverPathFor(BOOK_ID, "jpeg")).toBe(`${BOOK_ID}.jpg`);
    expect(coverPathFor(BOOK_ID.toUpperCase(), "png")).toBe(`${BOOK_ID}.png`);
    expect(coverPathFor(BOOK_ID, "webp")).toBe(`${BOOK_ID}.webp`);
    expect(coverPathFor(BOOK_ID, "gif")).toBe(`${BOOK_ID}.gif`);
    for (const format of ["jpeg", "png", "webp", "gif"] as const)
      expect(coverPathFor(BOOK_ID, format)).toMatch(COVER_PATH_PATTERN);
  });

  it("refuses anything that is not a uuid", () => {
    expect(coverPathFor("../etc/passwd", "jpeg")).toBeNull();
    expect(coverPathFor("OL123W", "jpeg")).toBeNull();
    expect(coverPathFor("", "jpeg")).toBeNull();
  });
});

describe("sniffImageFormat and imageDimensions", () => {
  it("recognises the four formats the bucket accepts", () => {
    expect(sniffImageFormat(fakeJpeg())).toBe("jpeg");
    expect(sniffImageFormat(fakePng(10, 10))).toBe("png");
    expect(sniffImageFormat(fakeGif(1, 1))).toBe("gif");
    expect(sniffImageFormat(fakeWebp())).toBe("webp");
    expect(
      sniffImageFormat(new TextEncoder().encode("<html>no</html>")),
    ).toBeNull();
  });

  it("reads width and height from the header", () => {
    expect(imageDimensions(fakeJpeg(180, 270), "jpeg")).toEqual({
      width: 180,
      height: 270,
    });
    expect(imageDimensions(fakePng(128, 200), "png")).toEqual({
      width: 128,
      height: 200,
    });
    expect(imageDimensions(fakeGif(1, 1), "gif")).toEqual({
      width: 1,
      height: 1,
    });
    expect(imageDimensions(fakeWebp(), "webp")).toBeNull();
  });
});

describe("isAllowedCoverSource", () => {
  it("allows the book databases over https", () => {
    expect(isAllowedCoverSource(OL_URL)).toBe(true);
    expect(isAllowedCoverSource(ARCHIVE_URL)).toBe(true);
    expect(
      isAllowedCoverSource(
        "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1",
      ),
    ).toBe(true);
    expect(
      isAllowedCoverSource("https://books.googleusercontent.com/x.jpg"),
    ).toBe(true);
  });

  it("refuses other hosts, http and look-alikes", () => {
    expect(
      isAllowedCoverSource("http://covers.openlibrary.org/b/id/1.jpg"),
    ).toBe(false);
    expect(isAllowedCoverSource("https://evilopenlibrary.org/x.jpg")).toBe(
      false,
    );
    expect(isAllowedCoverSource("https://openlibrary.org.evil.test/x")).toBe(
      false,
    );
    expect(isAllowedCoverSource("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedCoverSource("https://u:p@covers.openlibrary.org/x")).toBe(
      false,
    );
    expect(isAllowedCoverSource("not a url")).toBe(false);
  });

  it("allows this machine only when asked (local Supabase)", () => {
    expect(isAllowedCoverSource("https://127.0.0.1:3213/c.jpg")).toBe(false);
    expect(isAllowedCoverSource("https://127.0.0.1:3213/c.jpg", true)).toBe(
      true,
    );
    expect(isLocalSupabase("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabase("https://abcd.supabase.co")).toBe(false);
    expect(isLocalSupabase(undefined)).toBe(false);
  });
});

describe("downloadCover", () => {
  it("follows the Open Library redirect to archive.org", async () => {
    const fetch = fakeFetch({
      [OL_URL]: () =>
        new Response(null, { status: 302, headers: { location: ARCHIVE_URL } }),
      [ARCHIVE_URL]: () => imageResponse(fakeJpeg()),
    });
    const { format, bytes } = await downloadCover(OL_URL, { fetch });
    expect(format).toBe("jpeg");
    expect(bytes.byteLength).toBe(4000);
    expect(fetch).toHaveBeenCalledTimes(2);
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(
      /Lillyjean/,
    );
  });

  it("does not follow a redirect to another host", async () => {
    const fetch = fakeFetch({
      [OL_URL]: () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://internal.example/secret" },
        }),
    });
    await expect(downloadCover(OL_URL, { fetch })).rejects.toThrow(
      "source not allowed",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses non-images, placeholders and huge files", async () => {
    const cases: [() => Response, string][] = [
      [
        () =>
          new Response("<html/>", { headers: { "content-type": "text/html" } }),
        "not an image",
      ],
      [() => imageResponse(fakeGif(1, 1), "image/gif"), "placeholder"],
      [() => imageResponse(fakePng(1, 1, 5000), "image/png"), "placeholder"],
      [() => imageResponse(new Uint8Array(5000)), "unsupported image format"],
      [
        () =>
          imageResponse(fakeJpeg(), "image/jpeg", {
            "content-length": String(MAX_COVER_BYTES + 1),
          }),
        "too large",
      ],
      [
        () => imageResponse(fakeJpeg(180, 270, MAX_COVER_BYTES + 10)),
        "too large",
      ],
      [() => new Response("gone", { status: 404 }), "HTTP 404"],
    ];
    for (const [respond, reason] of cases)
      await expect(
        downloadCover(OL_URL, { fetch: fakeFetch({ [OL_URL]: respond }) }),
      ).rejects.toThrow(reason);
  });
});

describe("copyCover", () => {
  it("uploads the image and records the path", async () => {
    const { store, uploads, paths } = memoryStore();
    const fetch = fakeFetch({ [OL_URL]: () => imageResponse(fakeJpeg()) });
    const result = await copyCover({ id: BOOK_ID, cover_url: OL_URL }, store, {
      fetch,
    });
    expect(result).toEqual({ status: "stored", path: `${BOOK_ID}.jpg` });
    expect(uploads[0]).toMatchObject({
      path: `${BOOK_ID}.jpg`,
      contentType: "image/jpeg",
    });
    expect(paths.get(BOOK_ID)).toBe(`${BOOK_ID}.jpg`);
  });

  it("names the file after the real format, not the URL", async () => {
    const { store, uploads } = memoryStore();
    const fetch = fakeFetch({
      [OL_URL]: () => imageResponse(fakePng(180, 270), "image/jpeg"),
    });
    await copyCover({ id: BOOK_ID, cover_url: OL_URL }, store, { fetch });
    expect(uploads[0]).toMatchObject({
      path: `${BOOK_ID}.png`,
      contentType: "image/png",
    });
  });

  it("skips without touching storage when the cover is not usable", async () => {
    const { store } = memoryStore();
    const fetch = fakeFetch({
      [OL_URL]: () => imageResponse(fakeGif(1, 1), "image/gif"),
    });
    expect(
      await copyCover({ id: BOOK_ID, cover_url: OL_URL }, store, { fetch }),
    ).toEqual({ status: "skipped", reason: "placeholder" });
    expect(
      await copyCover({ id: BOOK_ID, cover_url: null }, store, { fetch }),
    ).toMatchObject({ status: "skipped" });
    expect(
      await copyCover({ id: "not-a-uuid", cover_url: OL_URL }, store, {
        fetch,
      }),
    ).toMatchObject({ status: "skipped" });
    expect(store.upload).not.toHaveBeenCalled();
    expect(store.setCoverPath).not.toHaveBeenCalled();
  });

  it("never throws: network, upload and update errors become results", async () => {
    const { store } = memoryStore();
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(
      await copyCover({ id: BOOK_ID, cover_url: OL_URL }, store, {
        fetch: offline,
      }),
    ).toEqual({ status: "failed", reason: "fetch failed" });

    const fetch = fakeFetch({ [OL_URL]: () => imageResponse(fakeJpeg()) });
    store.upload = vi.fn(async () => {
      throw new Error("upload: quota");
    });
    expect(
      await copyCover({ id: BOOK_ID, cover_url: OL_URL }, store, { fetch }),
    ).toEqual({ status: "failed", reason: "upload: quota" });
    expect(store.setCoverPath).not.toHaveBeenCalled();
  });
});

describe("supabaseCoverStore", () => {
  it("uploads with a one-year cache and updates the book", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const eq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));
    const client = {
      storage: { from: vi.fn(() => ({ upload })) },
      from: vi.fn(() => ({ update })),
    };
    const store = supabaseCoverStore(client);
    const bytes = fakeJpeg();
    await store.upload(`${BOOK_ID}.jpg`, bytes, "image/jpeg");
    await store.setCoverPath(BOOK_ID, `${BOOK_ID}.jpg`);
    expect(client.storage.from).toHaveBeenCalledWith("covers");
    expect(upload).toHaveBeenCalledWith(`${BOOK_ID}.jpg`, bytes, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(client.from).toHaveBeenCalledWith("books");
    expect(update).toHaveBeenCalledWith({ cover_path: `${BOOK_ID}.jpg` });
    expect(eq).toHaveBeenCalledWith("id", BOOK_ID);
  });

  it("turns Supabase errors into exceptions for copyCover", async () => {
    const client = {
      storage: {
        from: () => ({
          upload: async () => ({ error: { message: "mime type not allowed" } }),
        }),
      },
      from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
    };
    await expect(
      supabaseCoverStore(client).upload("x.jpg", fakeJpeg(), "image/jpeg"),
    ).rejects.toThrow("upload: mime type not allowed");
  });
});

describe("needsCoverCopy and mapLimited", () => {
  it("only books with a source and no copy need work", () => {
    expect(needsCoverCopy({ id: BOOK_ID, cover_url: OL_URL })).toBe(true);
    expect(
      needsCoverCopy({ id: BOOK_ID, cover_url: OL_URL, cover_path: "a.jpg" }),
    ).toBe(false);
    expect(needsCoverCopy({ id: BOOK_ID, cover_url: null })).toBe(false);
  });

  it("keeps the order and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapLimited([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return n * 2;
    });
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });
});
