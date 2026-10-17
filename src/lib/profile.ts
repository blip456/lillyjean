import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** The calendar year used for pledges and "books read this year". */
export function currentYear() {
  return new Date().getFullYear();
}

/**
 * The signed-in user with their profile and this year's pledge, once per request.
 * The email comes from the verified JWT claims instead of `auth.getUser()`, which would
 * add a round trip to Supabase Auth to every page render (T17).
 */
export const getCurrentAccount = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const year = currentYear();
  const [{ data: profile }, { data: pledge }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", claims.sub).single(),
    supabase
      .from("reading_pledges")
      .select("goal")
      .eq("year", year)
      .maybeSingle(),
  ]);
  if (!profile) return null;

  return {
    id: claims.sub,
    email: claims.email ?? "",
    profile,
    pledge: pledge?.goal ?? null,
    year,
  };
});

export type CurrentAccount = NonNullable<
  Awaited<ReturnType<typeof getCurrentAccount>>
>;
