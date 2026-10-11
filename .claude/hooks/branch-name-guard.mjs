#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks creating or pushing a branch whose name does not follow
// Conventional Branch (see scripts/branch-name.mjs). Exit code 2 blocks the tool call and shows
// stderr to Claude so it can pick a valid name.
import { readFileSync } from "node:fs";

import {
  BRANCH_RULE,
  checkBranchName,
  currentBranch,
} from "../../scripts/branch-name.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const names =
  input.tool_name === "Bash"
    ? branchesInCommand(input.tool_input?.command ?? "", input.cwd)
    : [input.tool_input?.branch].filter(Boolean); // GitHub MCP create_branch

const problems = names.map(checkBranchName).filter(Boolean);
if (problems.length > 0) {
  console.error(
    `Blocked: ${problems.join(" ")}\n\n${BRANCH_RULE}\n\nSee "Branches" in CLAUDE.md.`,
  );
  process.exit(2);
}

/** Branch names a shell command would create, rename to or push. Best effort: unknown forms pass. */
function branchesInCommand(command, cwd) {
  const found = [];
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const words = segment.trim().split(/\s+/).map(unquote);
    const redirect = words.findIndex((w) => /^(\d*[<>]|&>)/.test(w)); // 2>&1, > out.log
    if (redirect !== -1) words.length = redirect;
    const git = words.indexOf("git");
    if (git === -1) continue;
    let i = git + 1;
    while (words[i] === "-C" || words[i] === "-c") i += 2; // git -C <dir> / -c <key=value>
    const sub = words[i];
    const args = words.slice(i + 1);
    const options = args.filter((a) => a.startsWith("-"));
    const positional = args.filter((a) => !a.startsWith("-"));

    if (sub === "checkout" || sub === "switch") {
      const flag = args.findIndex((a) =>
        ["-b", "-B", "-c", "-C", "--create", "--force-create"].includes(a),
      );
      if (flag !== -1 && args[flag + 1]) found.push(args[flag + 1]);
    } else if (sub === "branch") {
      if (options.some((o) => ["-m", "-M", "--move"].includes(o))) {
        if (positional.length > 0) found.push(positional.at(-1));
      } else if (options.length === 0 && positional.length > 0) {
        found.push(positional[0]);
      }
    } else if (sub === "push") {
      if (options.some((o) => ["-d", "--delete", "--tags"].includes(o)))
        continue;
      const refspecs = positional.slice(1); // first positional is the remote
      if (refspecs.length === 0) {
        const branch = currentBranch(cwd);
        if (branch) found.push(branch);
      }
      for (const spec of refspecs) {
        const [source, target = source] = spec.replace(/^\+/, "").split(":");
        if (!source || !target || target.startsWith("refs/tags/")) continue; // ":x" deletes x
        const branch =
          target === "HEAD"
            ? currentBranch(cwd)
            : target.replace(/^refs\/heads\//, "");
        if (branch) found.push(branch);
      }
    }
  }
  return found;
}

function unquote(word) {
  return word.replace(/^["']|["']$/g, "");
}
