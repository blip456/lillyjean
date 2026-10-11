import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseBacklog, upcomingReleases } from "./roadmap";

/** Upcoming releases from docs/backlog.md, for the What's coming page. */
export async function getUpcomingReleases() {
  const file = path.join(process.cwd(), "docs", "backlog.md");
  const markdown = await readFile(file, "utf8").catch(() => "");
  return upcomingReleases(parseBacklog(markdown));
}
