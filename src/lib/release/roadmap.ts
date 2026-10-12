export type RoadmapRelease = {
  sprint: number;
  title: string;
  /** Semver of the release that ships this sprint, e.g. "0.3.0"; null when the sprint has no release. */
  version: string | null;
  done: boolean;
  goal: string | null;
  items: string[];
};

// "## Sprint 3 — Track your books · v0.3.0" (optionally followed by "✅").
const SPRINT_HEADING =
  /^##\s+Sprint\s+(\d+)\s+—\s+(.+?)(?:\s+·\s+(?:v(\d+\.\d+\.\d+)|no release))?\s*(✅)?\s*$/;
const ITEM = /^-\s+(.+)$/;
const SUB_ITEM = /^\s+-\s+(.+)$/;

/** Removes markdown emphasis and code marks so items read as plain text. */
function plain(text: string) {
  return text
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/** Parses the sprint sections of docs/backlog.md (see "How we work" there for the format). */
export function parseBacklog(markdown: string): RoadmapRelease[] {
  const releases: RoadmapRelease[] = [];
  let current: RoadmapRelease | null = null;
  let lastItem = -1;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const match = SPRINT_HEADING.exec(line);
      current = match
        ? {
            sprint: Number(match[1]),
            title: match[2].trim(),
            version: match[3] ?? null,
            done: Boolean(match[4]),
            goal: null,
            items: [],
          }
        : null;
      if (current) releases.push(current);
      lastItem = -1;
      continue;
    }
    if (!current) continue;

    if (line.startsWith("Goal:")) {
      const goal = plain(line.slice("Goal:".length));
      current.goal = goal.charAt(0).toUpperCase() + goal.slice(1);
      continue;
    }

    const item = ITEM.exec(line);
    if (item) {
      current.items.push(plain(item[1]));
      lastItem = current.items.length - 1;
      continue;
    }

    const subItem = SUB_ITEM.exec(line);
    if (subItem && lastItem >= 0) {
      current.items.push(plain(subItem[1]));
      continue;
    }

    // Wrapped continuation of the previous item (indented, not a new bullet).
    if (/^\s{2,}\S/.test(line) && lastItem >= 0) {
      current.items[lastItem] = `${current.items[lastItem]} ${plain(line)}`;
      continue;
    }

    if (line.trim() === "" || line.startsWith(">")) continue;
    lastItem = -1;
  }

  return releases;
}

/** Sprints that are not done yet and ship a release, in backlog order. */
export function upcomingReleases(releases: RoadmapRelease[]) {
  return releases.filter((release) => !release.done && release.version);
}
