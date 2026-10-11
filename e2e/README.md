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
