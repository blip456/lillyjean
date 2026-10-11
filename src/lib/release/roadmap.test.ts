import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseBacklog, sprintVersion, upcomingReleases } from "./roadmap";

const SAMPLE = `# Backlog

## How we work

- Not a sprint

## Sprint 2 — Accounts · v0.2.0 ✅

> Closed.

Goal: you can create an account.

- Sign up

## Sprint 3 — Track your books · v0.3.0

Goal: sign up and **track** what you read.

- Book search (Open Library); add a book by hand when nothing
  is found
- Swipe on a book (\`B4\`)
- Parent item:
  - Nested detail

## Sprint 1 — Setup · no release ✅

- Docs

## Later

- Not a release
`;

describe("parseBacklog", () => {
  it("reads sprint number, title, version, status, goal and items", () => {
    const releases = parseBacklog(SAMPLE);

    expect(releases.map((r) => [r.sprint, r.title, r.version, r.done])).toEqual(
      [
        [2, "Accounts", "0.2.0", true],
        [3, "Track your books", "0.3.0", false],
        [1, "Setup", null, true],
      ],
    );
    expect(releases[1].goal).toBe("Sign up and track what you read.");
    expect(releases[1].items).toEqual([
      "Book search (Open Library); add a book by hand when nothing is found",
      "Swipe on a book (B4)",
      "Parent item:",
      "Nested detail",
    ]);
  });

  it("lists only open sprints that ship a release", () => {
    expect(
      upcomingReleases(parseBacklog(SAMPLE)).map((r) => r.version),
    ).toEqual(["0.3.0"]);
  });

  it("finds the version of a sprint", () => {
    const releases = parseBacklog(SAMPLE);
    expect(sprintVersion(releases, 3)).toBe("0.3.0");
    expect(sprintVersion(releases, 1)).toBeNull();
    expect(sprintVersion(releases, 9)).toBeNull();
  });
});

describe("docs/backlog.md", () => {
  it("keeps a parseable version on every sprint (What's coming depends on it)", () => {
    const markdown = readFileSync(
      path.join(process.cwd(), "docs", "backlog.md"),
      "utf8",
    );
    const releases = parseBacklog(markdown);
    const sprintHeadings = markdown
      .split("\n")
      .filter((line) => /^## Sprint \d+/.test(line));

    expect(releases).toHaveLength(sprintHeadings.length);
    for (const release of releases.filter((r) => r.sprint !== 1)) {
      expect(release.version).toBe(
        `0.${release.sprint === 0 ? 1 : release.sprint}.0`,
      );
    }
    const upcoming = upcomingReleases(releases);
    expect(upcoming.length).toBeGreaterThan(0);
    for (const release of upcoming) {
      expect(release.goal).toBeTruthy();
      expect(release.items.length).toBeGreaterThan(0);
    }
  });
});
