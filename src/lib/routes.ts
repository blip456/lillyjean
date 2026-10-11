/** Pages for signed-out visitors; signed-in users are sent to Home instead. */
export const guestOnlyRoutes = [
  "/welcome",
  "/signup",
  "/login",
  "/login/code",
  "/forgot-password",
];

/** Pages anyone can open, signed in or not. */
export const publicRoutes = [
  ...guestOnlyRoutes,
  "/verify",
  "/changelog",
  "/auth/signout",
];

export function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
