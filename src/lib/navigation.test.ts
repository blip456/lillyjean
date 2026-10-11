import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  activeTab,
  addManuallyHref,
  COMING_SOON_SPRINT,
  hidesTabBar,
} from "./navigation";
import { parseBacklog, sprintVersion } from "./release/roadmap";

describe("COMING_SOON_SPRINT", () => {
  it("points at the backlog sprints that bring each tab", () => {
    const releases = parseBacklog(
      readFileSync(path.join(process.cwd(), "docs", "backlog.md"), "utf8"),
    );
    const versions = Object.fromEntries(
      Object.entries(COMING_SOON_SPRINT).map(([feature, sprint]) => [
        feature,
        sprintVersion(releases, sprint),
      ]),
    );
    expect(versions).toEqual({
      readlists: "0.4.0",
      challenges: "0.5.0",
      friends: "0.7.0",
    });
  });
});

describe("activeTab", () => {
  it("marks Home only on the home page", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/profile")).toBeNull();
    expect(activeTab("/books/search")).toBeNull();
  });

  it("marks a tab on its page and the pages below it", () => {
    expect(activeTab("/readlists")).toBe("readlists");
    expect(activeTab("/challenges/abc")).toBe("challenges");
    expect(activeTab("/friends")).toBe("friends");
  });

  it("does not match pages that only start with the same letters", () => {
    expect(activeTab("/friendship")).toBeNull();
  });
});

describe("hidesTabBar", () => {
  it("hides the tab bar in forms", () => {
    expect(hidesTabBar("/books/new")).toBe(true);
    expect(hidesTabBar("/settings/username")).toBe(true);
  });

  it("shows the tab bar on main and detail screens", () => {
    expect(hidesTabBar("/")).toBe(false);
    expect(hidesTabBar("/settings")).toBe(false);
    expect(hidesTabBar("/books/search")).toBe(false);
    expect(hidesTabBar("/books/mark-as-read")).toBe(false);
  });
});

describe("addManuallyHref", () => {
  it("passes the way back and the search text as title", () => {
    expect(
      addManuallyHref("/onboarding/currently-reading", " Emma & Co "),
    ).toBe(
      "/books/new?returnTo=%2Fonboarding%2Fcurrently-reading&title=Emma+%26+Co",
    );
  });

  it("leaves out an empty title", () => {
    expect(addManuallyHref("/onboarding/currently-reading", "  ")).toBe(
      "/books/new?returnTo=%2Fonboarding%2Fcurrently-reading",
    );
  });
});
