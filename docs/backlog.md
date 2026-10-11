# Backlog

We build in small, testable increments. The plan below is based on the wireframe review round
(Product Owner, Jean and Lilly; see [`docs/wireframes`](wireframes/)) and the decisions in
[`decisions.md`](decisions.md) (P7 onwards).

## How we work

- **Sprints of one week.** Every sprint delivers one increment of user value and ends with a release
  (version + changelog via release-please).
- **Testers:** Jean and Lilly, plus the Product Owner. The first tester release is at the end of Sprint 3.
- **Feedback per release:** a short "please try this" checklist for each release, plus the in-app feedback
  form for anything else.
- **One environment:** testers use production (Vercel + one Supabase project). Every change gets a Vercel
  preview link for the Product Owner before it is merged.
- **Wireframes first:** a screen is built only after its v2 wireframe is approved (Sprint 1).
- **Look and feel:** a clean default theme until the polish sprint; content (library card, covers) carries
  the personality.

## Sprint 0 — Foundation ✅

- Next.js 16 + TypeScript + Tailwind scaffold
- Supabase project config (local), typed client helpers, session-refresh proxy
- ESLint + Prettier, commitlint + lefthook, PR template
- release-please (semver + CHANGELOG + GitHub Releases), version and changelog visible in the app
- i18n setup (next-intl, `messages/en.json`, Loco-compatible)
- CI: lint, format, typecheck, test, build, commit/PR-title lint

## Sprint 1 — Wireframes v2 and production setup

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
- Review round with the Product Owner, Jean and Lilly (same feedback page and email flow as v1)
- Production setup: Supabase project, Vercel project, environment variables, `main` as default branch
  with branch protection, custom SMTP for the auth emails (Supabase's built-in sender is heavily
  rate-limited)
  — checklist in [`setup-production.md`](setup-production.md)

## Sprint 2 — Accounts (internal release, Product Owner tests)

Goal: you can create an account, get your library card and send feedback.

- Splash (animation on the very first open only) → session check → Welcome or Home
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

## Sprint 3 — Track your books (Release 1 to Jean and Lilly)

Goal: testers sign up and track what they read.

- Book search (Open Library, Google Books fallback) with `books` cache; manual book entry when nothing
  is found
- Book detail: cover, title, author, description, Google rating where available, "View on Goodreads"
- Statuses Want to read / Reading / Read; several books can be Reading at once; optional percentage on a
  Reading book
- Swipe on a book to change its status (main interaction); status control on the book detail
- Re-reads: a book can be marked as read again and counts again
- Onboarding step "Currently reading" (search, skip)
- Home v1: stats (books read this year vs pledge), currently reading
- **+** menu: Add book, Mark as read
- Test checklist for Jean and Lilly

## Sprint 4 — Readlists (Release 2)

Goal: collect books in readlists, like playlists.

- Create, rename and delete readlists; add/remove books; a book in many readlists
- Add-to-readlist sheet (multi-select + "New readlist")
- Readlists overview with the three statuses as system lists and the filter bar (`C1`)
- Automatic cover mosaic
- Home: readlists row; **+** menu: New readlist

## Sprint 5 — Personal challenges (Release 3)

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

## Sprint 6 — Official challenges and admin (Release 4)

Goal: the Product Owner publishes app-wide challenges that everyone can join.

- Admin screen: create, edit and end official challenges (same rules as personal challenges)
- Discover tab: official challenges with the "Official" badge; join from there
- Others' progress on official challenges: count of finishers only
- Admin screen keeps the feedback list (from Sprint 2)

## Sprint 7 — Friends (Release 5)

Goal: connect with friends and see what they read.

- Find people by username search; send, accept, decline and cancel friend requests; unfriend
- Friends tab: friends list and pending requests
- Friend profile: everything is visible to friends (library card, statuses, readlists, challenges)

## Sprint 8 — Share and recommend (Release 6)

Goal: reading together without bookclubs.

- Share a readlist with friends; the owner chooses view-only or edit
- Recommend a book or readlist to one or more friends with a short comment; "Recommended to you" section
- Share a challenge with friends: they are enrolled automatically and can leave; everyone in the challenge
  sees each other's pick and status
- Ratings with half stars; book detail shows the friends' average and the Google rating
- Deleted accounts: shared contributions stay, shown as "Kicked out of the library"

## Sprint 9 — Polish (Release 7)

Goal: make it feel like Lillyjean.

- Visual design: colours, typography, the "book nerdy" library card; applied across all screens
- First-open splash animation as an "unboxing" moment
- Accessibility pass (WCAG 2.2 AA), performance and offline shell for the PWA
- Fixes from tester feedback

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

## Dropped

- Sign out everywhere (PO feedback `G2`, `G-PO4`)
- Spin the wheel for challenges (neither end user wanted it)
- Sharing completed challenges on social media (all reviewers: no)
- Notifications inbox (bell) (all reviewers: no)
