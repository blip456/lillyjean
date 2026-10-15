# End-to-end checks

Browser checks of complete user flows against a **local** Supabase (never production). They are not part
of CI yet because they need the full local Supabase stack, including the email inbox.

## Accounts (Sprint 2)

`accounts.cjs` signs up with an email code, goes through onboarding, changes every setting, checks the
admin feedback list, logs in with a password and with a code, resets the password and deletes the account.

```bash
pnpm db:start                         # local Supabase incl. Auth and the Mailpit inbox
cp .env.example .env.local            # fill in the local URL + publishable key from `pnpm db:start`
pnpm build && pnpm start              # app on http://localhost:3000
npx playwright install chromium       # once, if Playwright is not installed
node e2e/accounts.cjs                 # prints PASS/FAIL per check, exits 1 on a failure
```

Options (environment variables): `BASE_URL`, `SHOTS` (screenshot folder, default `e2e/screenshots`),
`PW` (path to the Playwright package), `CHROMIUM_PATH`.

The run takes about two minutes: Supabase sends at most one email per address per minute, so the
password reset waits for that.

## Shared helpers and book data (Sprint 3)

`helpers.cjs` creates a ready-to-use account (confirmed, username set, optional pledge) through the local
Auth admin API, logs in through the app, and reports PASS/FAIL lines:

```js
const { createReader, logIn, reporter, visible } = require("./helpers.cjs");
const reader = await createReader("shelf", { pledge: 12 });
await logIn(page, reader);
```

Book checks need offline book data, because the checks must not depend on Open Library or Google Books:
add `BOOKS_API=fixtures` to `.env.local` before `pnpm build && pnpm start`. The books are listed in
`src/lib/books/providers/fixtures.ts` (for example, searching "austen" finds three books).

## Book search, book page and manual entry (Sprint 3)

`books-search.cjs` searches "austen" (live results, filters, refresh, quick add), opens a book (rating,
Goodreads link, status, mark as read with a past date, re-read, remove + Undo), adds a book manually
(required fields first), checks unknown book ids (404) and the search without JavaScript.

```bash
BASE_URL=http://localhost:3000 node e2e/books-search.cjs
```

## Status tracking (Sprint 3)

`book-status.cjs` covers the shelf lists (`/books/shelf/*`): the one-time swipe hint, swiping with mouse
and touch (reveal, long swipe, Undo), the status sheet (percentage, Clear, Remove + Undo), mark as read
with a past date, re-reads and keyboard use without swiping.

```bash
BASE_URL=http://localhost:3000 node e2e/book-status.cjs
```

## Home, tab bar, + menu and onboarding (Sprint 3)

`home-and-onboarding.cjs` creates an account without a username and goes through onboarding with the
"Currently reading" step (search, choose books, the manual-entry link, Skip), then checks Home (stats with
the pace line, currently reading, empty states), the tab bar (only shipped tabs), the + menu and the
mark-as-read picker.

```bash
BASE_URL=http://localhost:3000 node e2e/home-and-onboarding.cjs
```

All Sprint 3 checks run against one build with `BOOKS_API=fixtures` (about five minutes in total):
`accounts.cjs`, `books-search.cjs`, `book-status.cjs` and `home-and-onboarding.cjs`.

## Readlist screens (Sprint 4)

`readlists.cjs` checks the Readlists tab, the overview (C1: your three statuses as system lists, tiles with
the cover mosaic, empty state, no filter bar), creating a readlist (C3, with validation errors first and
with `?bookId=&returnTo=`), the readlist page (C2: mosaic, count, books newest first, ⋯ with Edit and
Delete), renaming, deleting with confirmation (the books stay on the shelf), the Home row ("All",
"+ New", empty state), "New readlist" in the + menu and 404 for someone else's readlist. Covers for the
mosaic are uploaded to the local `covers` bucket, so no internet is needed.

```bash
BASE_URL=http://localhost:3000 node e2e/readlists.cjs
```
