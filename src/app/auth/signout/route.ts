import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Signs out and returns to Welcome. Used when a soft-deleted account still has a session
 * (`?reason=deleted`); the regular sign-out button uses the `signOut` Server Action.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const url = new URL("/welcome", request.url);
  if (request.nextUrl.searchParams.get("reason") === "deleted")
    url.searchParams.set("deleted", "1");
  return NextResponse.redirect(url);
}
