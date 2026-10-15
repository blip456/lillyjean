/**
 * Copies one book cover from a book database into our public `covers` bucket (T20).
 *
 * Framework-free on purpose: the app uses it through `covers.server.ts`, and
 * `scripts/backfill-covers.mjs` imports this file directly (Node strips the types), so both follow
 * the same rules. Keep it free of runtime imports.
 *
 * Size: we copy the cover URL exactly as the app shows it today, so quality does not change:
 * Open Library `-M` (about 180 px wide, 10–25 KB) and Google's `zoom=1` thumbnail (about 128 px
 * wide). Lists show covers about 48 px wide and the book page about 128 CSS px (256 device px on
 * most phones). `-L` (about 500 px, often 3–5 times the bytes) would be sharper on the book page but
 * slower for the lists and mosaics, which show many covers at once; a second, larger copy for the
 * book page can be added later if it looks soft.
 */

/** Matches the bucket's limit (2 MB). */
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
/** Open Library answers a missing cover with a tiny 1×1 image; real covers are far larger. */
export const MIN_COVER_BYTES = 1024;
/** Images smaller than this in either direction are placeholders, not covers. */
const MIN_COVER_PIXELS = 16;
export const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const USER_AGENT = "Lillyjean (https://github.com/blip456/lillyjean)";

/** Same rule as the `book_cover_path` check on `books.cover_path`. */
export const COVER_PATH_PATTERN = /^[a-z0-9/_.-]{1,200}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Hosts the server may download covers from. Anyone signed in can save a book through the
 * database functions, so `cover_url` is not trusted: without this list the server could be made
 * to fetch internal addresses and publish the answer in the public bucket.
 * Open Library covers redirect to archive.org; Google covers live on books.google.com or
 * *.googleusercontent.com.
 */
const ALLOWED_HOST_SUFFIXES = [
  "openlibrary.org",
  "archive.org",
  "books.google.com",
  "googleusercontent.com",
];
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type ImageFormat = "jpeg" | "png" | "webp" | "gif";

const FORMATS: Record<ImageFormat, { contentType: string; extension: string }> =
  {
    jpeg: { contentType: "image/jpeg", extension: "jpg" },
    png: { contentType: "image/png", extension: "png" },
    webp: { contentType: "image/webp", extension: "webp" },
    gif: { contentType: "image/gif", extension: "gif" },
  };

export type CoverBook = {
  id: string;
  cover_url: string | null;
  cover_path?: string | null;
};

export type CopyResult =
  | { status: "stored"; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/** Where the copy goes and how the book row is updated (the Supabase admin client in practice). */
export type CoverStore = {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  setCoverPath(bookId: string, path: string): Promise<void>;
};

export type CopyOptions = {
  /** Also accept https covers from this machine; only for a local Supabase (tests). */
  allowLoopback?: boolean;
  fetch?: typeof fetch;
};

export function needsCoverCopy(book: CoverBook) {
  return Boolean(book.cover_url) && !book.cover_path;
}

/** True for a Supabase URL on this machine (`pnpm db:start`), never for a hosted project. */
export function isLocalSupabase(url: string | undefined) {
  try {
    return LOOPBACK_HOSTS.has(new URL(url ?? "").hostname);
  } catch {
    return false;
  }
}

export function isAllowedCoverSource(url: string, allowLoopback = false) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    return false;
  const host = parsed.hostname.toLowerCase();
  if (allowLoopback && LOOPBACK_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** The bucket path for a book's cover: `<book uuid>.<ext>`, or null for an unexpected id. */
export function coverPathFor(bookId: string, format: ImageFormat) {
  const id = bookId.toLowerCase();
  if (!UUID_PATTERN.test(id)) return null;
  const path = `${id}.${FORMATS[format].extension}`;
  return COVER_PATH_PATTERN.test(path) ? path : null;
}

export function contentTypeFor(format: ImageFormat) {
  return FORMATS[format].contentType;
}

/** The image format from the file's first bytes (more reliable than the server's header). */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (
    bytes[0] === 0x89 &&
    ascii(1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  )
    return "png";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** Width and height read from the image header, when cheap to find (not for WebP). */
export function imageDimensions(
  bytes: Uint8Array,
  format: ImageFormat,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (format === "png" && bytes.length >= 24)
      return { width: view.getUint32(16), height: view.getUint32(20) };
    if (format === "gif" && bytes.length >= 10)
      return {
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
      };
    if (format === "jpeg") {
      // Walk the segments to the frame header (SOF0–SOF15, except DHT/JPG/DAC).
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return null;
        const marker = bytes[offset + 1];
        if (marker === 0xff) {
          offset += 1;
          continue;
        }
        const length = view.getUint16(offset + 2);
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        )
          return {
            height: view.getUint16(offset + 5),
            width: view.getUint16(offset + 7),
          };
        offset += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}

class SkipError extends Error {}

/** Reads at most `limit` bytes; throws SkipError when the body is larger. */
async function readLimited(response: Response, limit: number) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > limit) throw new SkipError("too large");
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new SkipError("too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Downloads a cover, following redirects only to allowed hosts. Returns the bytes and format, or
 * throws SkipError (not a usable cover) / another error (network, timeout).
 */
export async function downloadCover(url: string, options: CopyOptions = {}) {
  const doFetch = options.fetch ?? fetch;
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let current = url;

  for (let hop = 0; ; hop++) {
    if (!isAllowedCoverSource(current, options.allowLoopback))
      throw new SkipError("source not allowed");
    const response = await doFetch(current, {
      headers: { Accept: "image/*", "User-Agent": USER_AGENT },
      redirect: "manual",
      signal,
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location || hop >= MAX_REDIRECTS)
        throw new SkipError("bad redirect");
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new SkipError(`HTTP ${response.status}`);
    }

    const type = response.headers.get("content-type") ?? "";
    if (!type.toLowerCase().startsWith("image/")) {
      await response.body?.cancel().catch(() => {});
      throw new SkipError("not an image");
    }

    const bytes = await readLimited(response, MAX_COVER_BYTES);
    if (bytes.byteLength < MIN_COVER_BYTES) throw new SkipError("placeholder");
    const format = sniffImageFormat(bytes);
    if (!format) throw new SkipError("unsupported image format");
    const size = imageDimensions(bytes, format);
    if (
      size &&
      (size.width < MIN_COVER_PIXELS || size.height < MIN_COVER_PIXELS)
    )
      throw new SkipError("placeholder");
    return { bytes, format };
  }
}

/** Copies one cover and records its path on the book. Never throws. */
export async function copyCover(
  book: CoverBook,
  store: CoverStore,
  options: CopyOptions = {},
): Promise<CopyResult> {
  try {
    if (!book.cover_url) return { status: "skipped", reason: "no cover" };
    if (!coverPathFor(book.id, "jpeg"))
      return { status: "skipped", reason: "unexpected book id" };

    const { bytes, format } = await downloadCover(book.cover_url, options);
    const path = coverPathFor(book.id, format)!;
    await store.upload(path, bytes, contentTypeFor(format));
    await store.setCoverPath(book.id, path);
    return { status: "stored", path };
  } catch (error) {
    if (error instanceof SkipError)
      return { status: "skipped", reason: error.message };
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Runs `task` over `items` with at most `concurrency` at a time; keeps the input order. */
export async function mapLimited<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

type StorageError = { message: string } | null;

/** Minimal shape of the Supabase client used here (kept structural so this file has no imports). */
export type SupabaseAdminLike = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Uint8Array,
        options: { cacheControl: string; contentType: string; upsert: boolean },
      ): PromiseLike<{ error: StorageError }>;
    };
  };
  from(table: "books"): {
    update(values: { cover_path: string }): {
      eq(column: "id", value: string): PromiseLike<{ error: StorageError }>;
    };
  };
};

/** A CoverStore backed by the Supabase admin client: one-year browser cache, overwrite allowed. */
export function supabaseCoverStore(
  client: SupabaseAdminLike,
  bucket = "covers",
): CoverStore {
  return {
    async upload(path, bytes, contentType) {
      const { error } = await client.storage.from(bucket).upload(path, bytes, {
        cacheControl: "31536000",
        contentType,
        upsert: true,
      });
      if (error) throw new Error(`upload: ${error.message}`);
    },
    async setCoverPath(bookId, path) {
      const { error } = await client
        .from("books")
        .update({ cover_path: path })
        .eq("id", bookId);
      if (error) throw new Error(`update: ${error.message}`);
    },
  };
}
