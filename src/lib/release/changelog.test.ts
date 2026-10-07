import { describe, expect, it } from "vitest";

import { parseChangelog } from "./changelog";

const SAMPLE = `# Changelog

## [0.3.0](https://github.com/owner/repo/compare/v0.2.0...v0.3.0) (2026-11-02)

### Features

* **readlists:** share a readlist with a bookclub ([1a2b3c4](https://github.com/owner/repo/commit/1a2b3c4))
* add reading pledge to onboarding ([5d6e7f8](https://github.com/owner/repo/commit/5d6e7f8)), closes [#12](https://github.com/owner/repo/issues/12)

### Bug Fixes

* **auth:** keep the session after the code is verified ([9a8b7c6](https://github.com/owner/repo/commit/9a8b7c6))

## 0.2.0 (2026-10-20)

### Features

* first release
`;

describe("parseChangelog", () => {
  it("parses releases, sections, scopes and strips commit links", () => {
    const releases = parseChangelog(SAMPLE);

    expect(releases.map((r) => [r.version, r.date])).toEqual([
      ["0.3.0", "2026-11-02"],
      ["0.2.0", "2026-10-20"],
    ]);
    expect(releases[0].sections.map((s) => s.title)).toEqual([
      "Features",
      "Bug Fixes",
    ]);
    expect(releases[0].sections[0].items).toEqual([
      { scope: "readlists", text: "share a readlist with a bookclub" },
      { scope: null, text: "add reading pledge to onboarding" },
    ]);
    expect(releases[0].sections[1].items[0]).toEqual({
      scope: "auth",
      text: "keep the session after the code is verified",
    });
  });

  it("returns an empty list when there are no releases", () => {
    expect(parseChangelog("# Changelog\n")).toEqual([]);
  });
});
