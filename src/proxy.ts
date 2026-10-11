import { type NextRequest, NextResponse } from "next/server";

import { guestOnlyRoutes, matchesRoute, publicRoutes } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Keep refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!userId && !matchesRoute(pathname, publicRoutes))
    return redirectTo("/welcome");
  if (userId && matchesRoute(pathname, guestOnlyRoutes)) return redirectTo("/");

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation and PWA files.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
