import "server-only";

import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";

import {
  copyCover,
  type CopyResult,
  type CoverBook,
  type CoverStore,
  isLocalSupabase,
  mapLimited,
  needsCoverCopy,
  supabaseCoverStore,
} from "./cover-copy";
import { COVERS_BUCKET } from "./covers";

/**
 * Stored covers (T20): the server copies each book's cover once into the public `covers` bucket
 * with the secret key. Without `SUPABASE_SECRET_KEY` everything here does nothing and the app keeps
 * showing the original cover URLs.
 */

const DEFAULT_MAX = 8;
const CONCURRENCY = 3;
/** A cover that could not be copied is retried after this long (per server instance). */
const RETRY_AFTER_MS = 6 * 60 * 60 * 1000;

const inFlight = new Set<string>();
const failedAt = new Map<string, number>();
let store: CoverStore | null | undefined;
let warnedMissingKey = false;

function coverStore(): CoverStore | null {
  if (store !== undefined) return store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    if (!warnedMissingKey && process.env.NODE_ENV !== "test")
      console.warn(
        "SUPABASE_SECRET_KEY is not set: book covers are not copied to Storage (T20).",
      );
    warnedMissingKey = true;
    store = null;
    return store;
  }
  const admin = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  store = supabaseCoverStore(admin, COVERS_BUCKET);
  return store;
}

function copyOptions() {
  // Covers served from this machine are only accepted next to a local Supabase (tests).
  return {
    allowLoopback: isLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
}

/** Copies one book's cover to Storage and sets `books.cover_path`. Never throws. */
export async function storeCover(book: CoverBook): Promise<CopyResult> {
  const target = coverStore();
  if (!target) return { status: "skipped", reason: "no secret key" };
  const result = await copyCover(book, target, copyOptions());
  if (result.status === "failed")
    console.warn(`Cover for book ${book.id} not copied: ${result.reason}`);
  return result;
}

/**
 * Copies the covers of up to `max` books that have a cover URL but no stored copy yet. Books
 * already being copied, or that failed recently, are left out. Never throws.
 */
export async function storeMissingCovers(
  books: CoverBook[],
  { max = DEFAULT_MAX }: { max?: number } = {},
): Promise<CopyResult[]> {
  try {
    if (!coverStore()) return [];
    const now = Date.now();
    const picked: CoverBook[] = [];
    for (const book of books) {
      if (picked.length >= max) break;
      if (!needsCoverCopy(book) || inFlight.has(book.id)) continue;
      const failed = failedAt.get(book.id);
      if (failed !== undefined && now - failed < RETRY_AFTER_MS) continue;
      inFlight.add(book.id);
      picked.push(book);
    }
    if (picked.length === 0) return [];

    return await mapLimited(picked, CONCURRENCY, async (book) => {
      try {
        const result = await storeCover(book);
        if (result.status === "stored") failedAt.delete(book.id);
        else {
          if (failedAt.size > 5000) failedAt.clear();
          failedAt.set(book.id, Date.now());
        }
        return result;
      } finally {
        inFlight.delete(book.id);
      }
    });
  } catch (error) {
    console.warn("Copying covers failed", error);
    return [];
  }
}

/**
 * Schedules `storeMissingCovers` after the response is sent (Next.js `after()`), so pages never
 * wait for it. Outside a request (scripts, tests) it runs in the background instead.
 * Cheap when there is nothing to do or no secret key.
 */
export function queueMissingCovers(
  books: CoverBook[],
  options?: { max?: number },
) {
  if (!books.some(needsCoverCopy) || !coverStore()) return;
  const run = async () => {
    await storeMissingCovers(books, options);
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

/** For tests: forget the cached client, the missing-key warning and the retry memory. */
export function resetCoverStoreForTests() {
  store = undefined;
  warnedMissingKey = false;
  inFlight.clear();
  failedAt.clear();
}
