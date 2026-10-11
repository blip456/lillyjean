# Contributing

## Setup

```bash
pnpm install          # also installs the git hooks (lefthook)
cp .env.example .env.local
pnpm db:start         # local Supabase (needs Docker); prints the URL and publishable key
pnpm dev
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org). They drive the version number and
the changelog shown in the app, so write them for a reader of the changelog.

```
<type>(<optional scope>): <what changed, lower case, imperative>
```

| Type                                                        | Use for                   | Version bump (after 1.0) | In changelog |
| ----------------------------------------------------------- | ------------------------- | ------------------------ | ------------ |
| `feat`                                                      | a new user-facing feature | minor                    | Features     |
| `fix`                                                       | a user-facing bug fix     | patch                    | Bug Fixes    |
| `perf`                                                      | a performance improvement | patch                    | Performance  |
| `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style` | everything else           | none                     | hidden       |

Breaking change: add `!` after the type (`feat!: …`) or a `BREAKING CHANGE:` footer. Before 1.0 a
breaking change bumps the minor version.

Allowed scopes: `auth`, `home`, `books`, `readlists`, `challenges`, `clubs`, `friends`, `admin`, `feedback`,
`profile`, `ui`, `i18n`, `db`, `api`, `ci`, `deps`, `release`, `docs`.

The `commit-msg` hook checks this locally; CI checks every commit and the PR title.

## Branches and pull requests

- Branch from `main`, open a PR, squash-merge. The PR title becomes the commit on `main`.
- Branch names follow [Conventional Branch](https://conventionalbranch.org): `<type>/<description>`.
  Types: `feature/` (or `feat/`), `bugfix/` (or `fix/`), `hotfix/`, `release/`, `chore/`. The
  description is lower case with hyphens (`feature/add-login-page`, `fix/header-bug`,
  `release/v1.2.0`). The `pre-push` hook and CI check it; GitHub refuses to create other branches.
  Rename a branch with `git branch -m <type>/<description>`.
- Every PR runs lint, format check, typecheck, tests and build.

## Releases

On every push to `main`, release-please keeps a release PR up to date. Merging that PR bumps
`package.json`, updates `CHANGELOG.md`, tags `vX.Y.Z` and publishes a GitHub Release. The app shows
the version and the changelog at `/changelog`.

Version numbers follow the sprints (decision D8):

- Sprint N ships as **v0.N.0**. Merge the release PR once, at the end of the sprint, so each sprint gives
  exactly one minor release.
- Hotfixes between sprints are patch releases (v0.N.1, v0.N.2, …). Give their PR a `fix:` title: before
  1.0, release-please turns `feat:` into a minor bump, which would take the next sprint's number.
- Sprint headings in `docs/backlog.md` carry their version (`## Sprint 3 — Track your books · v0.3.0`).
  The app's **What's coming** page (`/whats-coming`) is generated from the open sprints in that file, so
  keep the headings in this format.
- CI on a release PR only starts after **Approve and run** on the PR.

## UI copy and translations

- Never hard-code user-facing text: add it to `messages/en.json` and use `useTranslations` /
  `getTranslations`.
- `en.json` is the source locale. Other locales are exported from Loco into `messages/<locale>.json`.
- Input fields get a visible label. Do not use example values as placeholders.

## Database

- Every schema change is a migration in `supabase/migrations` (`pnpm exec supabase migration new <name>`).
- Every table has RLS enabled and explicit `GRANT`s.
- Regenerate types after a migration: `pnpm db:types`.
