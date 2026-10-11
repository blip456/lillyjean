#!/usr/bin/env node
// Conventional Branch names (https://conventionalbranch.org): <type>/<description>.
// Single source of truth for the lefthook pre-push hook, CI and the Claude Code hook.
//
// Usage: node scripts/branch-name.mjs [branch]   (defaults to the current branch)
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const BRANCH_TYPES = [
  "feature",
  "feat",
  "bugfix",
  "fix",
  "hotfix",
  "release",
  "chore",
];

// Branches that are not ours to name: the trunk and the release PR branch release-please opens.
const EXEMPT = [/^main$/, /^release-please--/];

// Lower-case letters and digits, separated by single hyphens. Release versions may also use dots
// (release/v1.2.0). No leading, trailing or consecutive separators.
const DESCRIPTION = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RELEASE_DESCRIPTION = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export const BRANCH_RULE = `Branch names follow Conventional Branch: <type>/<description>
  types: ${BRANCH_TYPES.map((t) => `${t}/`).join(", ")}
  description: lower case a-z and 0-9 with single hyphens (dots only in release versions)
  examples: feature/add-login-page, fix/header-bug, hotfix/security-patch, release/v1.2.0,
            chore/update-dependencies`;

/** Returns null when the name is valid, otherwise the reason it is not. */
export function checkBranchName(name) {
  if (EXEMPT.some((re) => re.test(name))) return null;
  const slash = name.indexOf("/");
  if (slash === -1) return `"${name}" has no <type>/ prefix.`;
  const type = name.slice(0, slash);
  const description = name.slice(slash + 1);
  if (!BRANCH_TYPES.includes(type))
    return `"${type}/" is not an allowed branch type.`;
  const pattern = type === "release" ? RELEASE_DESCRIPTION : DESCRIPTION;
  if (!pattern.test(description))
    return `"${description}" is not a valid branch description.`;
  return null;
}

export function currentBranch(cwd) {
  try {
    const name = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return name && name !== "HEAD" ? name : null; // HEAD = detached, nothing to check
  } catch {
    return null;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const name = process.argv[2] || currentBranch();
  const problem = name ? checkBranchName(name) : null;
  if (problem) {
    console.error(`Invalid branch name: ${problem}\n\n${BRANCH_RULE}`);
    console.error(`\nRename it with: git branch -m <type>/<description>`);
    process.exit(1);
  }
}
