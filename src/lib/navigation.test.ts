import { describe, expect, it } from "vitest";

import {
  activeTab,
  addManuallyHref,
  hidesTabBar,
  shippedTabs,
  TABS,
} from "./navigation";

describe("shippedTabs", () => {
  it("shows Home, Readlists and Challenges in Sprint 5 (no coming-soon tabs, N1)", () => {
    expect(shippedTabs().map((tab) => tab.id)).toEqual([
      "home",
      "readlists",
      "challenges",
    ]);
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
    expect(activeTab("/friends")).toBeNull();
    expect(activeTab("/friends/abc")).toBeNull();
  });

  it("marks Challenges on Active, Past, a challenge and its pick page (Sprint 5)", () => {
    expect(activeTab("/challenges")).toBe("challenges");
    expect(activeTab("/challenges/past")).toBe("challenges");
    expect(activeTab("/challenges/abc")).toBe("challenges");
    expect(activeTab("/challenges/abc/pick")).toBe("challenges");
    expect(activeTab("/challengesx")).toBeNull();
  });

  it("marks Readlists on the overview and every readlist page (Sprint 4)", () => {
    expect(activeTab("/readlists")).toBe("readlists");
    expect(activeTab("/readlists/0b6f1c1e-7d4f-4c1a-9a43-1f2a3b4c5d6e")).toBe(
      "readlists",
    );
    expect(activeTab("/readlistsx")).toBeNull();
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
    expect(hidesTabBar("/readlists/new")).toBe(true);
    expect(hidesTabBar("/readlists/abc/edit")).toBe(true);
    expect(hidesTabBar("/challenges/new")).toBe(true);
    expect(hidesTabBar("/challenges/abc/edit")).toBe(true);
  });

  it("shows the tab bar on main and detail screens", () => {
    expect(hidesTabBar("/")).toBe(false);
    expect(hidesTabBar("/settings")).toBe(false);
    expect(hidesTabBar("/books/search")).toBe(false);
    expect(hidesTabBar("/books/mark-as-read")).toBe(false);
    expect(hidesTabBar("/readlists")).toBe(false);
    expect(hidesTabBar("/readlists/abc")).toBe(false);
    expect(hidesTabBar("/readlists/abc/edit/more")).toBe(false);
    expect(hidesTabBar("/challenges")).toBe(false);
    expect(hidesTabBar("/challenges/past")).toBe(false);
    expect(hidesTabBar("/challenges/abc")).toBe(false);
    expect(hidesTabBar("/challenges/abc/pick")).toBe(false);
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
