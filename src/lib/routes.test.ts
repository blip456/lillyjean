import { describe, expect, it } from "vitest";

import { guestOnlyRoutes, matchesRoute, publicRoutes } from "./routes";

describe("matchesRoute", () => {
  it("matches exact paths and sub paths", () => {
    expect(matchesRoute("/login", guestOnlyRoutes)).toBe(true);
    expect(matchesRoute("/login/code", guestOnlyRoutes)).toBe(true);
    expect(matchesRoute("/verify", publicRoutes)).toBe(true);
  });

  it("does not match lookalike prefixes or private pages", () => {
    expect(matchesRoute("/loginx", guestOnlyRoutes)).toBe(false);
    expect(matchesRoute("/", publicRoutes)).toBe(false);
    expect(matchesRoute("/settings", publicRoutes)).toBe(false);
    expect(matchesRoute("/reset-password", publicRoutes)).toBe(false);
  });
});
