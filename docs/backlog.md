# Backlog

We build in small, testable increments. The plan below is based on the wireframe review round
(Product Owner, Jean and Lilly; see [`docs/wireframes`](wireframes/)) and the decisions in
[`decisions.md`](decisions.md) (P7 onwards).

## How we work

- **Sprints of one week.** Every sprint delivers one increment of user value and ends with a release
  (version + changelog via release-please).
- **Versions:** sprint N ships as **v0.N.0** (Sprint 3 → v0.3.0, Sprint 4 → v0.4.0, …). Hotfixes between
  sprints are patch releases (v0.N.1, v0.N.2, …) and use `fix:` pull request titles. To get exactly one
  minor release per sprint, merge the release PR once at the end of the sprint. Each sprint heading below
  shows its version; the app's **What's coming** page (Settings → About) is generated from these sections.
- **Testers:** Jean and Lilly, plus the Product Owner. The first tester release is v0.3.0 (Sprint 3).
- **Feedback per release:** a short "please try this" checklist for each release, plus the in-app feedback
  form for anything else.
- **One environment:** testers use production (Vercel + one Supabase project). Every change gets a Vercel
  preview link for the Product Owner before it is merged.
- **Wireframes first:** screens are built from the approved v2 wireframes (`docs/wireframes/v2`).
- **Look and feel:** a clean default theme until the polish sprint; content (library card, covers) carries
  the personality.

## Sprint 0 — Foundation · v0.1.0 ✅

- Next.js 16 + TypeScript + Tailwind scaffold
- Supabase project config (local), typed client helpers, session-refresh proxy
- ESLint + Prettier, commitlint + lefthook, PR template
- release-please (semver + CHANGELOG + GitHub Releases), version and changelog visible in the app
- i18n setup (next-intl, `messages/en.json`, Loco-compatible)
- CI: lint, format, typecheck, test, build, commit/PR-title lint

## Sprint 1 — Wireframes v2 and production setup · no release ✅

> Closed on 2026-10-11. Wireframes v2 were approved by the Product Owner without a second review
> round (decision D7); production is set up, with database deployments via GitHub Actions (T15).

Goal: everyone agrees on what we build, and there is a place to release it.

- Wireframes v2 for the full app, reflecting decisions P7 onwards:
  - Friends replace bookclubs (new: find friends, requests, friend profile, recommend sheet, "Recommended
    to you")
  - Classic tab bar: Home · Readlists · **+** · Challenges · Friends; profile behind the avatar
  - **+** menu: Add book · Mark as read · New challenge · New readlist
  - Simplified status sheet (`B3`) with optional percentage; book detail (`D2`) without page tracking and
    details section, "Add this book" for challenges
  - Challenge indicator on books (`B1`, `D1`); counter without arrow (`E7`); "Challenges" instead of
    "Stamps" (`G1`)
  - Admin screen (feedback list, official challenges) and in-app feedback form
  - Small "What's new" banner; settings without notifications and without "sign out everywhere"
- ~~Review round with the Product Owner, Jean and Lilly~~ — skipped (decision D7)
- Production setup: Supabase project, Vercel project, environment variables, `main` as default branch
  with branch protection, custom SMTP for the auth emails (Supabase's built-in sender is heavily
  rate-limited)
  — checklist in [`setup-production.md`](setup-production.md)

## Sprint 2 — Accounts · v0.2.0 ✅

> Closed on 2026-10-11. Released as **v0.2.0** (accounts, onboarding, settings, feedback) and **v0.2.1**
> (release PR titles, clean What's new list). Hotfix **v0.2.2** adds the What's coming page (decision D8).
> Tested by the Product Owner on production: account created, admin role set, daily account clean-up job
> visible in Supabase. Verified before release with 25 database tests, unit tests and an end-to-end browser
> check of every flow (`e2e/accounts.cjs`).
>
> Changes against the plan:
>
> - The first-open splash **animation** moved to Sprint 9 (polish), as in wireframe A1; Sprint 2 ships a
>   plain, fast start.
> - Onboarding has two steps (library card, pledge); "Currently reading" joins in Sprint 3.
> - The 6-digit code is one field with autofill instead of six boxes (decision A13).
>
> Learned along the way: release PRs need a valid commit scope (fixed in v0.2.1) and their CI only runs
> after a manual "Approve and run" (see Later); the free Supabase plan needs custom SMTP before the email
> templates can be edited.

Goal: you can create an account, get your library card and send feedback.

- Plain, fast start → session check → Welcome or Home (first-open animation moved to Sprint 9)
- Sign up (email + password), confirm with 6-digit code, resend with cooldown; neutral message for
  existing emails
- Log in, forgot password (code → new password), "email me a code instead"
- Onboarding: Library card (username, standard rules), reading pledge (books only, optional)
- `profiles` table + RLS, route protection, admin role
- Profile: library card with initials; Settings: change username (max once per 30 days), change email
  (with verification), sign out, delete account (soft delete, hard delete after 14 days)
- About: version + changelog; small "What's new" banner once after an update
- In-app feedback form; mini admin screen listing feedback, sortable old → new and new → old
- PWA basics: manifest, icons, installable on the home screen

## Sprint 3 — Track your books · v0.3.0

> Built on 2026-10-12, in review by the Product Owner before the release PR is merged. Shipped in four
> pull requests: the book tracking foundation (database, Open Library / Google Books, decisions
> P35–P38, T18, T19), search + book page + manual entry, status tracking (swipe, status sheet, mark as
> read, Undo, P39) and Home + tab bar + + menu + onboarding. Checked with 189 unit tests, 32 database
> tests and four end-to-end checks (`e2e/`); the "please try this" list for Jean and Lilly is
> [`test-checklists/v0.3.0.md`](test-checklists/v0.3.0.md).
>
> Still to check before the release: swiping on a real Android phone and an installed iPhone app, and a
> Google Books API key in Vercel (`GOOGLE_BOOKS_API_KEY`) so Google ratings show reliably.

Goal: the first release for Jean and Lilly: sign up and track what you read.

- Book search (Open Library, with Google Books as fallback); add a book by hand when nothing is found
- Book detail: cover, title, author, description, Google rating where available, "View on Goodreads"
- Statuses Want to read / Reading / Read; several books can be Reading at once; optional percentage on a
  Reading book
- Swipe on a book to change its status (main interaction); status control on the book detail
- Re-reads: a book can be marked as read again and counts again
- Onboarding step "Currently reading" (search, skip)
- Home v1: stats (books read this year vs pledge), currently reading
- **+** menu: Add book, Mark as read
- Test checklist for Jean and Lilly

## Sprint 4 — Readlists · v0.4.0

> Built on 2026-10-15, in review by the Product Owner before the release PR is merged. Shipped in four
> pull requests: the readlists foundation (database, covers bucket, decisions P40–P42, T20), stored
> covers, the book menu + add-to-readlist sheet + readlists on the book page (P43), and the readlist
> screens + Readlists tab + Home row + "New readlist" (P44). Checked with unit tests, 78 database tests
> and six end-to-end checks (`e2e/`); the "please try this" list for Jean and Lilly is
> [`test-checklists/v0.4.0.md`](test-checklists/v0.4.0.md).
>
> Still to check before the release: `SUPABASE_SECRET_KEY` in Vercel so covers are stored (until then
> they load from Open Library / Google Books as before), and the long press on a real Android phone and
> an installed iPhone app. The filter bar on the overview waits until sharing ships (P42).

> Added after v0.3.0 tester feedback (Jean): covers load slowly, especially for books already on your
> lists. Plan: copy each cover to Supabase Storage once, when the book is first saved in `books`; serve it
> with long cache headers so the browser keeps it; copy the covers already in `books` once. This replaces
> "covers are loaded directly" in T18 (and goes back to T3); add the new decision to `decisions.md` when
> it is built. The cover mosaic below loads many covers at once, so it builds on this.

Goal: collect books in readlists, like playlists.

- Create, rename and delete readlists; add/remove books; a book in many readlists
- Add-to-readlist sheet (multi-select + "New readlist")
- Readlists overview with your three statuses as lists and a filter bar
- Faster book covers: covers are stored in Lillyjean's own storage, so they load quickly and stay saved
  on your phone
- Automatic cover mosaic
- Home: readlists row; **+** menu: New readlist

## Sprint 5 — Personal challenges · v0.5.0

> Built on 2026-10-17, in review by the Product Owner before the release PR is merged. Shipped in four
> pull requests: the challenges foundation (database rules, completion derived from reads, P49–P51,
> T23), create and edit (E6, E8, + menu), the Challenges tab and challenge page (N1, E1, E3, E4, E5), and
> challenges in the rest of the app (completion celebration E7, Mark as read preview, indicators on books,
> "Fits your challenges", Home, library card; P52). Checked with unit tests, database tests and eleven
> end-to-end checks (`e2e/`); the "please try this" list for Jean and Lilly is
> [`test-checklists/v0.5.0.md`](test-checklists/v0.5.0.md).
>
> Still to check before the release: the celebration and its vibration on a real phone.

Goal: set yourself reading challenges and complete them.

- Create a challenge: title, theme, start date (required), end date (optional), **at least 5** candidate
  books (search or import from a readlist)
- Join and pick a book, or submit an own pick (accepted automatically)
- Completing: marking a picked book as read completes every challenge it was picked for; only books
  finished after the challenge start count (re-reads included); no late completion
- Creator can change dates and candidates after the start; a removed candidate stays valid as an own pick
- Active and Past tabs; Past shows completed challenges only, missed ones disappear
- Completion celebration and completed-challenges counter (no arrow)
- Challenge indicator on books (search results, Home, book detail with "Add this book")
- Home: ongoing challenges section; profile: completed challenges on the library card
- **+** menu: New challenge

## Sprint 6 — Official challenges and admin · v0.6.0

> Before this sprint starts: decide the [open questions from Sprint 5](#open-questions).

Goal: the Product Owner publishes app-wide challenges that everyone can join.

- Admin screen: create, edit and end official challenges (same rules as personal challenges)
- Discover tab: official challenges with the "Official" badge; join from there
- Others' progress on official challenges: count of finishers only
- Admin screen keeps the feedback list (from Sprint 2)
- British English dates everywhere: "7 October" (P53, first task of the sprint)

## Sprint 7 — Friends · v0.7.0

Goal: connect with friends and see what they read.

- Find people by username search; send, accept, decline and cancel friend requests; unfriend
- Friends tab: friends list and pending requests
- Friend profile: everything is visible to friends (library card, statuses, readlists, challenges)

## Sprint 8 — Share and recommend · v0.8.0

Goal: reading together without bookclubs.

- Share a readlist with friends; the owner chooses view-only or edit
- Recommend a book or readlist to one or more friends with a short comment; "Recommended to you" section
- Share a challenge with friends: they are enrolled automatically and can leave; everyone in the challenge
  sees each other's pick and status
- Ratings with half stars; book detail shows the friends' average and the Google rating
- Deleted accounts: shared contributions stay, shown as "Kicked out of the library"

## Sprint 9 — Polish · v0.9.0

Goal: make it feel like Lillyjean.

- Visual design: colours, typography, the "book nerdy" library card; applied across all screens
- First-open splash animation as an "unboxing" moment (moved from Sprint 2)
- Accessibility pass (WCAG 2.2 AA), performance and offline shell for the PWA
- Fixes from tester feedback

## Open questions

Raised while building Sprint 5 (2026-10-17). Decide before Sprint 6 starts; each answer becomes a decision
in `decisions.md` and, where needed, a small task in the next sprint. OQ-1 to OQ-4 were decided on 2026-10-20
(P53–P56).

| #    | Question                                                                                                                           | Now (v0.5.0)                                         | Options                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| OQ-5 | "Add it manually" in the book search of the New challenge form?                                                                    | Left out: leaving the form would lose what was typed | Add it and keep the form's state while away; or keep |
| OQ-6 | Home without challenges: show "No challenges yet" + New challenge, or hide the section (wireframe note "empty sections collapse")? | Empty state shown                                    | Hide the section; or keep the empty state            |

## Later

Product

- Bookclubs: groups with shared challenges, one shared club readlist per club, member progress; roles to
  decide (Jean: creator removes members, deletes the club and names a new owner on leaving); maximum 15
  members; invite by username or email; invite links (expiry, single- or multi-use, email mismatch);
  activity feed and club activity on Home (PO feedback, `F`-flow, `A12`–`A14`, `B1`)
- Notes on books: private, or shared with friends (a favourite scene, why you recommend it)
- Reading streak, with the user choosing weekly or monthly in settings
- Profile photo upload (PNG/JPG, max 1000 px, max 5 MB, compressed; stored in Supabase Storage)
- Custom readlist cover (choose a book cover or upload a picture)
- Manual ordering of books in a readlist
- Pick-my-next-read card deck
- In-app notifications (e.g. for recommendations)
- Public profiles and public readlists
- Trophy cabinet on the profile with past years' reading pledges
- ISBN barcode scanning
- Edition-level tracking (only if users ask for it)

Platform

- Google sign-in
- Dutch translation via Loco
- Username login (if users ask for it)
- Passkeys (once Supabase support is stable)
- Check new passwords against known breached passwords (Supabase Pro feature)
- Run CI on release PRs automatically: give release-please a fine-grained access token, so release PRs no
  longer need a manual "Approve and run"
- Run the end-to-end checks (`e2e/`) in CI against a local Supabase

## Dropped

- Sign out everywhere (PO feedback `G2`, `G-PO4`)
- Spin the wheel for challenges (neither end user wanted it)
- Sharing completed challenges on social media (all reviewers: no)
- Notifications inbox (bell) (all reviewers: no)
