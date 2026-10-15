import { afterEach, describe, expect, it, vi } from "vitest";

import { coverUrlFor } from "./covers";

afterEach(() => vi.unstubAllEnvs());

describe("coverUrlFor", () => {
  it("prefers the stored copy", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
    expect(
      coverUrlFor({
        cover_path: "openlibrary/OL1W.jpg",
        cover_url: "https://covers.openlibrary.org/b/id/1-M.jpg",
      }),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/covers/openlibrary/OL1W.jpg",
    );
  });

  it("falls back to the original cover", () => {
    expect(
      coverUrlFor({ cover_path: null, cover_url: "https://example.org/c.jpg" }),
    ).toBe("https://example.org/c.jpg");
    expect(coverUrlFor({ cover_url: null })).toBeNull();
  });
});
