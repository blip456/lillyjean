import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { checkBranchName } from "./branch-name.mjs";

describe("checkBranchName", () => {
  it.each([
    "feature/add-login-page",
    "feat/add-login-page",
    "bugfix/fix-header-bug",
    "fix/header-bug",
    "hotfix/security-patch",
    "release/v1.2.0",
    "chore/update-dependencies",
    "feature/issue-123-new-login",
    "main",
    "release-please--branches--main",
  ])("accepts %s", (name) => {
    expect(checkBranchName(name)).toBeNull();
  });

  it.each([
    "cleanupdocs",
    "claude/compassionate-hopper-nzdolb",
    "design-system",
    "feature/Add-Login",
    "feature/add_login",
    "feature/add--login",
    "feature/-add-login",
    "feature/add-login-",
    "feature/",
    "feature/v1.2",
    "release/v1..2",
    "docs/update-readme",
  ])("rejects %s", (name) => {
    expect(checkBranchName(name)).not.toBeNull();
  });
});

describe("Claude Code branch-name guard", () => {
  const guard = path.resolve(
    import.meta.dirname,
    "../.claude/hooks/branch-name-guard.mjs",
  );
  const run = (input) =>
    spawnSync("node", [guard], {
      input: JSON.stringify(input),
      encoding: "utf8",
    }).status;
  const bash = (command) => run({ tool_name: "Bash", tool_input: { command } });

  it.each([
    "git checkout -b cleanupdocs",
    "git switch -c claude/some-session",
    "git fetch origin main && git checkout -B wip origin/main",
    "git branch -m old-name newname",
    "git push -u origin cleanupdocs",
    "git push origin HEAD:refs/heads/wip",
  ])("blocks %s", (command) => {
    expect(bash(command)).toBe(2);
  });

  it.each([
    "git checkout -b chore/cleanup-docs",
    "git switch -c feature/add-login-page",
    "git push -u origin fix/header-bug",
    "git push -u origin fix/header-bug 2>&1 | tail -3",
    "git branch -m chore/tidy > /dev/null",
    "git push origin --delete cleanupdocs",
    "git push origin :cleanupdocs",
    "git branch -D cleanupdocs",
    "git checkout main",
    "pnpm test",
  ])("allows %s", (command) => {
    expect(bash(command)).toBe(0);
  });

  it("checks branches created through the GitHub MCP server", () => {
    const create = (branch) =>
      run({ tool_name: "mcp__github__create_branch", tool_input: { branch } });
    expect(create("cleanupdocs")).toBe(2);
    expect(create("chore/cleanup-docs")).toBe(0);
  });
});
