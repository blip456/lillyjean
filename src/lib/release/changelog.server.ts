import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseChangelog } from "./changelog";

/** Reads CHANGELOG.md (maintained by release-please) from the repo root. */
export async function getChangelog() {
  const file = path.join(process.cwd(), "CHANGELOG.md");
  const markdown = await readFile(file, "utf8").catch(() => "");
  return parseChangelog(markdown);
}
