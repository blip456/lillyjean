import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const after = vi.fn();
vi.mock("next/server", () => ({ after: (task: () => unknown) => after(task) }));

const upload = vi.fn();
const eq = vi.fn();
const createClient = vi.fn(() => ({
  storage: { from: () => ({ upload }) },
  from: () => ({ update: () => ({ eq }) }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...(args as [])),
}));

const {
  queueMissingCovers,
  resetCoverStoreForTests,
  storeCover,
  storeMissingCovers,
} = await import("./covers.server");

const ids = Array.from(
  { length: 12 },
  (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
);
const book = (i: number, extra: object = {}) => ({
  id: ids[i],
  cover_url: `https://covers.openlibrary.org/b/id/${i + 1}-M.jpg`,
  cover_path: null,
  ...extra,
});

function jpeg(size = 4000) {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 200, 0, 120]);
  return bytes;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetCoverStoreForTests();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  upload.mockReset().mockResolvedValue({ error: null });
  eq.mockReset().mockResolvedValue({ error: null });
  after.mockReset();
  createClient.mockClear();
  fetchMock = vi.fn(
    async () =>
      new Response(jpeg() as BodyInit, {
        headers: { "content-type": "image/jpeg" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("without SUPABASE_SECRET_KEY", () => {
  beforeEach(() => vi.stubEnv("SUPABASE_SECRET_KEY", ""));

  it("does nothing at all", async () => {
    expect(await storeCover(book(0))).toEqual({
      status: "skipped",
      reason: "no secret key",
    });
    expect(await storeMissingCovers([book(0), book(1)])).toEqual([]);
    queueMissingCovers([book(0)]);
    expect(after).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("storeCover", () => {
  it("copies the cover with the secret key, without a session", async () => {
    expect(await storeCover(book(0))).toEqual({
      status: "stored",
      path: `${ids[0]}.jpg`,
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_secret_test",
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: false }),
      }),
    );
    expect(upload).toHaveBeenCalledWith(
      `${ids[0]}.jpg`,
      expect.any(Uint8Array),
      { cacheControl: "31536000", contentType: "image/jpeg", upsert: true },
    );
    expect(eq).toHaveBeenCalledWith("id", ids[0]);
  });

  it("does not accept covers from this machine next to a hosted Supabase", async () => {
    expect(
      await storeCover({
        id: ids[0],
        cover_url: "https://127.0.0.1:3213/c.jpg",
      }),
    ).toEqual({ status: "skipped", reason: "source not allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when the update fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    eq.mockResolvedValue({ error: { message: "permission denied" } });
    expect(await storeCover(book(0))).toEqual({
      status: "failed",
      reason: "update: permission denied",
    });
  });
});

describe("storeMissingCovers", () => {
  it("only picks books with a cover URL and no stored copy, up to max", async () => {
    const books = [
      book(0, { cover_path: `${ids[0]}.jpg` }),
      book(1, { cover_url: null }),
      ...ids.slice(2).map((_, i) => book(i + 2)),
    ];
    const results = await storeMissingCovers(books, { max: 4 });
    expect(results).toHaveLength(4);
    expect(upload.mock.calls.map((call) => call[0])).toEqual(
      ids.slice(2, 6).map((id) => `${id}.jpg`),
    );
  });

  it("uses a batch of 8 by default with at most 3 downloads at once", async () => {
    let running = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return new Response(jpeg() as BodyInit, {
        headers: { "content-type": "image/jpeg" },
      });
    });
    const results = await storeMissingCovers(ids.map((_, i) => book(i)));
    expect(results).toHaveLength(8);
    expect(peak).toBe(3);
  });

  it("does not copy the same book twice at the same time", async () => {
    const [first, second] = await Promise.all([
      storeMissingCovers([book(0), book(1)]),
      storeMissingCovers([book(0), book(1)]),
    ]);
    expect(first).toHaveLength(2);
    expect(second).toEqual([]);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("does not retry a cover that failed recently", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await storeMissingCovers([book(0)])).toEqual([
      { status: "failed", reason: "fetch failed" },
    ]);
    expect(await storeMissingCovers([book(0)])).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("queueMissingCovers", () => {
  it("schedules the work with after() and returns at once", async () => {
    queueMissingCovers([book(0)]);
    expect(after).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
    await after.mock.calls[0][0]();
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("skips scheduling when every book already has a stored copy", () => {
    queueMissingCovers([book(0, { cover_path: "x.jpg" })]);
    expect(after).not.toHaveBeenCalled();
  });

  it("runs in the background outside a request instead of throwing", async () => {
    after.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope.");
    });
    expect(() => queueMissingCovers([book(0)])).not.toThrow();
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
  });
});
