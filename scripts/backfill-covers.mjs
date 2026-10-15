#!/usr/bin/env node
// Copies the covers of books saved before stored covers existed (T20) into the `covers` bucket.
// Optional: the app also copies covers lazily the first time a book is shown.
//
//   node --env-file=.env.local scripts/backfill-covers.mjs [--dry-run] [--limit=500]
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the environment. Safe to re-run: books
// that already have a stored copy are skipped, and a cover is only ever written to its own path.
// Needs Node 22.18 or newer (it imports the shared TypeScript rules in src/lib/books/cover-copy.ts).
import { createClient } from "@supabase/supabase-js";

import {
  copyCover,
  isLocalSupabase,
  mapLimited,
  supabaseCoverStore,
} from "../src/lib/books/cover-copy.ts";

const PAGE_SIZE = 50;
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (server-only secret key) first.",
  );
  process.exit(1);
}
if (!Number.isFinite(limit) && limitArg) {
  console.error("--limit must be a number, e.g. --limit=200");
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
const store = supabaseCoverStore(admin);
const options = { allowLoopback: isLocalSupabase(url) };

const totals = { stored: 0, skipped: 0, failed: 0 };
const reasons = new Map();
let seen = 0;
let lastId = null;

console.log(
  `${dryRun ? "Dry run: listing" : "Copying"} covers of books without a stored copy on ${new URL(url).host}…`,
);

while (seen < limit) {
  let query = admin
    .from("books")
    .select("id, cover_url, cover_path")
    .is("cover_path", null)
    .not("cover_url", "is", null)
    .order("id")
    .limit(Math.min(PAGE_SIZE, limit - seen));
  // Page by id, so books whose cover cannot be copied are not fetched again.
  if (lastId) query = query.gt("id", lastId);
  const { data: books, error } = await query;
  if (error) {
    console.error(`Could not read books: ${error.message}`);
    process.exit(1);
  }
  if (!books.length) break;
  lastId = books[books.length - 1].id;
  seen += books.length;

  if (dryRun) {
    for (const book of books) console.log(`  ${book.id}  ${book.cover_url}`);
    continue;
  }

  const results = await mapLimited(books, CONCURRENCY, (book) =>
    copyCover(book, store, options),
  );
  results.forEach((result, index) => {
    totals[result.status]++;
    if (result.status !== "stored") {
      const key = `${result.status}: ${result.reason}`;
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
      if (result.status === "failed")
        console.warn(`  ${books[index].id}  ${result.reason}`);
    }
  });
  console.log(
    `  ${seen} checked: ${totals.stored} stored, ${totals.skipped} skipped, ${totals.failed} failed`,
  );
}

if (dryRun) {
  console.log(`${seen} book(s) would be checked. Nothing was written.`);
} else {
  console.log(
    `Done. ${seen} book(s) checked: ${totals.stored} stored, ${totals.skipped} skipped (no usable cover), ${totals.failed} failed.`,
  );
  for (const [reason, count] of reasons) console.log(`  ${count} × ${reason}`);
  if (totals.failed)
    console.log(
      "Failed covers are retried the next time you run this, or when the book is shown in the app.",
    );
}
