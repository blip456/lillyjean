# Lillyjean

A social reading tracker: keep track of what you read, collect books in **readlists**, take on
**reading challenges** and follow your **bookclub**'s progress.

> Status: Sprint 0 (foundation). See [docs/backlog.md](docs/backlog.md).

## Stack

Next.js 16 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) · next-intl · Vercel.
Decisions and alternatives: [docs/decisions.md](docs/decisions.md).

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
pnpm dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit rules, releases and database workflow.

## Scripts

| Script                                    | What it does                                          |
| ----------------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                                | Start the dev server                                  |
| `pnpm build`                              | Production build                                      |
| `pnpm lint` / `pnpm format`               | ESLint / Prettier                                     |
| `pnpm typecheck`                          | Generate route types and run `tsc`                    |
| `pnpm test`                               | Unit tests (Vitest)                                   |
| `pnpm db:start` / `db:reset` / `db:types` | Local Supabase, reset with migrations, generate types |

## Versioning

One semver version for the whole app, managed by release-please from Conventional Commits. The current
version and the changelog are visible in the app at `/changelog`.
