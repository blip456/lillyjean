# Backlog

We build in small increments. Every increment starts with a wireframe review (see
[`docs/wireframes`](wireframes/)) and ends with a release via release-please.

## Sprint 0 — Foundation ✅

- Next.js 16 + TypeScript + Tailwind scaffold
- Supabase project config (local), typed client helpers, session-refresh proxy
- ESLint + Prettier, commitlint + lefthook, PR template
- release-please (semver + CHANGELOG + GitHub Releases), version and changelog visible in the app
- i18n setup (next-intl, `messages/en.json`, Loco-compatible)
- CI: lint, format, typecheck, test, build, commit/PR-title lint

## Sprint 1 — Sign in & onboarding (flow A)

- Splash → session check → Welcome or Home
- Sign up (email + password), confirm with 6-digit code, resend with cooldown
- Log in, forgot password (code → new password), "email me a code instead"
- Onboarding: Library card (username), Currently reading (optional), Reading pledge (optional)
- `profiles` table + RLS, route protection in the proxy
- Settings: sign out, sign out everywhere, delete account; About with version + What's new

## Sprint 2 — Books & readlists (flows C, D)

- Book search (Open Library, Google Books fallback) + `books` cache
- Book detail with "View on Goodreads", reading status
- Readlists: create, edit, add/remove books, a book in many readlists

## Sprint 3 — Challenges (flow E)

- Personal challenges: create, candidate books, own pick, complete by reading one book
- Official challenges (admin role), Discover tab, completed counter, past challenges

## Sprint 4 — Bookclubs (flow F)

- Create club, invite by username or email (invite links), accept/decline
- Share challenges and readlists with clubs, member progress, activity feed

## Sprint 5 — Home & polish (flow B)

- Home dashboard: ongoing challenges, stats, currently reading, quick access to readlists
- PWA: manifest, icons, install prompt, offline shell

## Later

- Google sign-in
- In-app ratings and reviews for club members
- Dutch translation via Loco
- Username login (if users ask for it)
- Passkeys (once Supabase support is stable)
