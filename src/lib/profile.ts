import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** The signed-in user with their profile and this year's pledge, once per request. */
export const getCurrentAccount = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const year = new Date().getFullYear();
  const [{ data: profile }, { data: pledge }, { data: user }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("reading_pledges")
        .select("goal")
        .eq("year", year)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);
  if (!profile) return null;

  return {
    id: userId,
    email: user.user?.email ?? "",
    profile,
    pledge: pledge?.goal ?? null,
    year,
  };
});

export type CurrentAccount = NonNullable<
  Awaited<ReturnType<typeof getCurrentAccount>>
>;
