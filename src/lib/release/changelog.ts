export type ChangelogItem = { scope: string | null; text: string };
export type ChangelogSection = { title: string; items: ChangelogItem[] };
export type ChangelogRelease = {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
};

const RELEASE_HEADING =
  /^##\s+\[?(\d+\.\d+\.\d+[^\]\s]*)\]?(?:\([^)]*\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?/;
const SECTION_HEADING = /^###\s+(.+)$/;
const ITEM = /^[*-]\s+(?:\*\*([^*]+):\*\*\s+)?(.+)$/;
// release-please appends the commit link and issue refs, e.g. " ([abc1234](https://...)), closes [#12](...)".
const TRAILING_REFS = /\s+\(\[[0-9a-f]{7,40}\]\(.*$/;

/** Parses a release-please / conventional-changelog CHANGELOG.md into structured releases. */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    const releaseMatch = RELEASE_HEADING.exec(line);
    if (releaseMatch) {
      release = {
        version: releaseMatch[1],
        date: releaseMatch[2] ?? null,
        sections: [],
      };
      releases.push(release);
      section = null;
      continue;
    }

    const sectionMatch = SECTION_HEADING.exec(line);
    if (sectionMatch && release) {
      section = { title: sectionMatch[1].trim(), items: [] };
      release.sections.push(section);
      continue;
    }

    const itemMatch = ITEM.exec(line);
    if (itemMatch && section) {
      section.items.push({
        scope: itemMatch[1]?.trim() ?? null,
        text: itemMatch[2].replace(TRAILING_REFS, "").trim(),
      });
    }
  }

  return releases;
}
