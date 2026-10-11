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
