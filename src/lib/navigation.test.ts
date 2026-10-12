import { describe, expect, it } from "vitest";

import {
  activeTab,
  addManuallyHref,
  hidesTabBar,
  shippedTabs,
  TABS,
} from "./navigation";

describe("shippedTabs", () => {
  it("shows only Home in Sprint 3 (no coming-soon tabs, N1)", () => {
    expect(shippedTabs().map((tab) => tab.id)).toEqual(["home"]);
  });

  it("keeps every tab in its own slot around the + (slot 3)", () => {
    expect(TABS.map((tab) => [tab.id, tab.slot])).toEqual([
      ["home", 1],
      ["readlists", 2],
      ["challenges", 4],
      ["friends", 5],
    ]);
  });
});

describe("activeTab", () => {
  it("marks Home only on the home page", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/profile")).toBeNull();
    expect(activeTab("/books/search")).toBeNull();
  });

  it("ignores tabs that have not shipped", () => {
    expect(activeTab("/readlists")).toBeNull();
  });

  it("marks a shipped tab on its page and the pages below it", () => {
    expect(activeTab("/readlists", TABS)).toBe("readlists");
    expect(activeTab("/challenges/abc", TABS)).toBe("challenges");
    expect(activeTab("/friendship", TABS)).toBeNull();
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
