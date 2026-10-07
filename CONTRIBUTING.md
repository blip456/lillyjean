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

Allowed scopes: `auth`, `home`, `books`, `readlists`, `challenges`, `clubs`, `profile`, `ui`, `i18n`,
`db`, `api`, `ci`, `deps`, `release`, `docs`.

The `commit-msg` hook checks this locally; CI checks every commit and the PR title.

## Branches and pull requests

- Branch from `main`, open a PR, squash-merge. The PR title becomes the commit on `main`.
- Every PR runs lint, format check, typecheck, tests and build.

## Releases

On every push to `main`, release-please keeps a release PR up to date. Merging that PR bumps
`package.json`, updates `CHANGELOG.md`, tags `vX.Y.Z` and publishes a GitHub Release. The app shows
the version and the changelog at `/changelog`.

## UI copy and translations

- Never hard-code user-facing text: add it to `messages/en.json` and use `useTranslations` /
  `getTranslations`.
- `en.json` is the source locale. Other locales are exported from Loco into `messages/<locale>.json`.
- Input fields get a visible label. Do not use example values as placeholders.

## Database

- Every schema change is a migration in `supabase/migrations` (`pnpm exec supabase migration new <name>`).
- Every table has RLS enabled and explicit `GRANT`s.
- Regenerate types after a migration: `pnpm db:types`.
