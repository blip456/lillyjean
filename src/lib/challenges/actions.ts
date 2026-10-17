"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { bookIdSchema } from "@/lib/books/validation";
import { createClient } from "@/lib/supabase/server";

import { CHALLENGES_PATH, challengeHref } from "./links";
import { getChallenge } from "./queries.server";
import type { CompletedChallenge } from "./types";
import { challengeIdSchema, challengeSchema } from "./validation";

/**
 * Server Actions for challenges. The database functions keep the rules
 * (supabase/migrations/20261017090000_challenges.sql). Errors are translation keys under `errors`.
 */

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

/** Database error messages that have their own translation; anything else is "unknown". */
const KNOWN_ERRORS: Record<string, string> = {
  challenge_too_few_candidates: "challengeTooFewCandidates",
  challenge_too_many_candidates: "challengeTooManyCandidates",
  challenge_locked: "challengeLocked",
  challenge_completed: "challengeCompleted",
  challenge_ended: "challengeEnded",
  challenge_not_found: "challengeNotFound",
};

function errorKey(error: { message?: string } | null | undefined) {
  const match = Object.keys(KNOWN_ERRORS).find((key) =>
    error?.message?.includes(key),
  );
  if (!match) console.error(error);
  return match ? KNOWN_ERRORS[match] : "unknown";
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/welcome");
  return supabase;
}

/** Pages stay in the client cache for a while (T17); drop them so every screen shows the change. */
function refreshPages() {
  revalidatePath("/", "layout");
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Fields of the challenge form (E6, E8): `bookId` repeats once per candidate. */
function parseForm(formData: FormData) {
  return challengeSchema.safeParse({
    title: field(formData, "title"),
    theme: field(formData, "theme"),
    startsOn: field(formData, "startsOn"),
    endsOn: field(formData, "endsOn"),
    bookIds: formData
      .getAll("bookId")
      .filter((value): value is string => typeof value === "string"),
  });
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues)
    errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}

/** E6 Create challenge: goes to the new challenge (E4). */
export async function createChallenge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await requireUser();
  const { data: id, error } = await supabase.rpc("create_challenge", {
    p_title: parsed.data.title,
    p_theme: parsed.data.theme ?? "",
    p_starts_on: parsed.data.startsOn,
    // Null = no end date; the generated types do not mark SQL parameters as nullable.
    p_ends_on: parsed.data.endsOn as string,
    p_book_ids: parsed.data.bookIds,
  });
  if (error || !id) return { error: errorKey(error) };

  refreshPages();
  redirect(challengeHref(id), RedirectType.replace);
}

/** E6 before the start / E8 after the start: saves and goes back to the challenge. */
export async function updateChallenge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = challengeIdSchema.safeParse(field(formData, "id"));
  if (!id.success) return { error: "unknown" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await requireUser();
  const { error } = await supabase.rpc("update_challenge", {
    p_challenge_id: id.data,
    p_title: parsed.data.title,
    p_theme: parsed.data.theme ?? "",
    p_starts_on: parsed.data.startsOn,
    // Null = no end date; the generated types do not mark SQL parameters as nullable.
    p_ends_on: parsed.data.endsOn as string,
    p_book_ids: parsed.data.bookIds,
  });
  if (error) return { error: errorKey(error) };

  refreshPages();
  redirect(challengeHref(id.data), RedirectType.replace);
}

/**
 * E4 ⋯ Delete (after a confirmation in the UI): goes to the Challenges tab. Completed
 * challenges cannot be deleted (P49). Returns only on an error.
 */
export async function deleteChallenge(
  challengeId: string,
): Promise<ActionResult> {
  const id = challengeIdSchema.safeParse(challengeId);
  if (!id.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { error } = await supabase.rpc("delete_challenge", {
    p_challenge_id: id.data,
  });
  if (error) return { ok: false, error: errorKey(error) };
  refreshPages();
  redirect(CHALLENGES_PATH, RedirectType.replace);
}

/**
 * Pick a book for a challenge (E4 "Add this book", E5 own pick, D2 "Add this book"). Any book can
 * be picked (P11). When the book was already read inside the window, the challenge completes
 * at once (P50) and `completed` says what the celebration (E7) shows.
 */
export async function pickChallengeBook(
  challengeId: string,
  bookId: string,
): Promise<ActionResult<{ completed: CompletedChallenge | null }>> {
  const challenge = challengeIdSchema.safeParse(challengeId);
  const book = bookIdSchema.safeParse(bookId);
  if (!challenge.success || !book.success)
    return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { data: completedOn, error } = await supabase.rpc(
    "pick_challenge_book",
    { p_challenge_id: challenge.data, p_book_id: book.data },
  );
  if (error) return { ok: false, error: errorKey(error) };
  refreshPages();

  if (!completedOn) return { ok: true, data: { completed: null } };
  const detail = await getChallenge(challenge.data);
  return {
    ok: true,
    data: {
      completed: detail && {
        id: detail.id,
        title: detail.title,
        bookTitle: detail.pick?.title ?? "",
      },
    },
  };
}
