@AGENTS.md

# Project rules

- Read `docs/decisions.md` before changing architecture; add a new entry when a decision changes.
- Feature screens are built only after their wireframe in `docs/wireframes` is approved.
- Commits follow Conventional Commits with the scopes in `commitlint.config.mjs` (see CONTRIBUTING.md).
- All UI copy goes through next-intl (`messages/en.json`). Inputs have visible labels; never put example
  values in placeholders.
- Supabase: use `src/lib/supabase/{client,server}.ts`; validate auth on the server with `getClaims()`;
  every table gets RLS + explicit GRANTs in its migration.
- Before pushing: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.

## Branches

Every branch follows [Conventional Branch](https://conventionalbranch.org): `<type>/<description>`.
`scripts/branch-name.mjs` is the source of truth; a Claude Code hook (`.claude/settings.json`), the
lefthook `pre-push` hook, CI (`Branch name`) and a GitHub ruleset all enforce it.

| Type                    | Use for                                    | Commit / PR title type                             |
| ----------------------- | ------------------------------------------ | -------------------------------------------------- |
| `feature/` (or `feat/`) | a new feature                              | `feat`                                             |
| `bugfix/` (or `fix/`)   | a bug fix                                  | `fix`                                              |
| `hotfix/`               | an urgent fix between sprints (patch)      | `fix`                                              |
| `release/`              | preparing a release, e.g. `release/v1.2.0` | `chore(release)`                                   |
| `chore/`                | non-feature work: docs, deps, CI, tooling  | `chore`, `docs`, `ci`, `build`, `refactor`, `test` |

- Description: lower case `a-z` and `0-9`, words joined by single hyphens, short (2–5 words) and
  describing the change, e.g. `feature/add-login-page`, `chore/update-dependencies`. Dots only in
  release versions. An issue key may lead: `feature/issue-123-new-login`.
- Pick the type yourself from the request. The session name is a hint: in a "features" session default
  to `feature/`, in a "chores" session to `chore/`. When the request does not fit the session, or the
  type or description is unclear, ask before creating the branch.
- Always branch from the latest `main`.
- Claude Code cloud sessions suggest a `claude/<name>` branch. Do not use it: create the conventional
  branch instead and push there. This rule is the standing permission to do so.
