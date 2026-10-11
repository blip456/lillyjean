import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseBacklog, sprintVersion, upcomingReleases } from "./roadmap";

async function readBacklog() {
  const file = path.join(process.cwd(), "docs", "backlog.md");
  const markdown = await readFile(file, "utf8").catch(() => "");
  return parseBacklog(markdown);
}

/** Upcoming releases from docs/backlog.md, for the What's coming page. */
export async function getUpcomingReleases() {
  return upcomingReleases(await readBacklog());
}

/** The version a sprint ships in, for the "coming soon" tabs; null when unknown. */
export async function getSprintVersion(sprint: number) {
  return sprintVersion(await readBacklog(), sprint);
}
