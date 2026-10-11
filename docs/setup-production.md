# Production setup (Sprint 1)

One-time setup of the environment testers will use (decision T12: production only). Most steps need the
Product Owner's own accounts. Steps marked **(dev)** are done in the repo by the developer once the values
are shared. Never paste secret keys into chat, issues or commits; use the Vercel and GitHub settings screens.

## 1. GitHub repository

- [ ] **Default branch:** Settings → General → Default branch → `main`.
- [ ] **Merge button:** Settings → General → Pull Requests → allow **squash merging** only, and set the
      default commit message to "Pull request title". The PR title becomes the commit on `main` and the
      changelog line.
- [ ] **Allow release-please to open release PRs:** Settings → Actions → General → Workflow permissions →
      "Read and write permissions" and tick "Allow GitHub Actions to create and approve pull requests".
- [ ] **Protect `main`:** Settings → Rules → Rulesets → New ruleset → **Import a ruleset** →
      `.github/rulesets/protect-main.json`. It sets up:
  - require a pull request before merging (squash only, no approvals needed for a solo developer);
  - require status checks: `Lint, typecheck, test, build` and `Conventional commits`;
  - block force pushes and deleting `main`;
  - repository admins (you) may bypass the rules **when merging a pull request**, never for direct pushes.
    Needed because release PRs opened by release-please use GitHub's built-in token, and GitHub does not
    start CI for those. Alternative: let **(dev)** switch release-please to a fine-grained personal access
    token stored as a repository secret, then remove the bypass.
- [ ] Merge the open work from `claude/elegant-hawking-25bf1r` into `main` via a pull request.

## 2. Supabase project

- [ ] Create a project at [supabase.com](https://supabase.com) (region close to the testers, e.g. an EU
      region). Note: free projects pause after a period of inactivity.
- [ ] **API keys:** Project Settings → API Keys. Copy the **project URL** and the **publishable key** for
      Vercel (step 3). The **secret key** is only needed later for server-side tasks; keep it out of the
      frontend.
- [ ] **Auth settings:** Authentication → Sign In / Providers → Email:
  - email provider on, **confirm email** on (decision A3);
  - minimum password length **12** (decision A5);
  - email OTP length **6**, OTP expiry **900 s** (10–15 minutes).
- [ ] **URL configuration:** Authentication → URL Configuration → Site URL = the production URL from
      Vercel (step 3); add the Vercel preview URL pattern to the redirect URLs.
- [ ] **Email templates and auth settings for accounts:** see step 5 (Sprint 2).
- [ ] **Custom SMTP** (decision T13): Authentication → Emails → SMTP Settings. The built-in sender only
      allows a handful of emails per hour, which breaks sign-up codes during testing. Options:
  - a transactional email service with your **own domain** (e.g. Resend, Postmark): best delivery, needs
    DNS records on a domain you own;
  - **chosen for now (no own domain yet, decision T13):** a service that allows a **verified single sender
    address** without a domain (e.g. Brevo): quicker,
    but emails are more likely to land in spam.
    Check the provider's current free-tier limits before choosing.
- [ ] Database changes are applied by GitHub Actions; see step 4.

## 3. Vercel project

- [ ] Import the GitHub repository at [vercel.com](https://vercel.com) **once**, as a project named
      `lillyjean`; framework preset Next.js; production branch `main`. Every Vercel project linked to the
      repo builds every push and posts its own deployment status on pull requests, so a second import
      (Vercel then names it e.g. `lillyjean-xxxx`) means duplicate builds; delete it under that project's
      Settings → General → Delete Project.
- [ ] Environment variables (Settings → Environment Variables), for Production and Preview:
  - `NEXT_PUBLIC_SUPABASE_URL` = project URL from step 2
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key from step 2
- [ ] Deploy and copy the production URL back into Supabase (step 2, URL configuration).
- [ ] Optional: a custom domain for the app (Settings → Domains). The free Hobby plan is meant for
      non-commercial use; fine for testing.

## 4. Database deployments via GitHub Actions (decision T15)

Database changes (migrations in `supabase/migrations`) are applied to production by the **Database
deploy** workflow (`.github/workflows/db-deploy.yml`) after they are merged to `main`. Every pull request
also runs a **Database** check in CI against a temporary local database. The Supabase credentials live
only in GitHub; they never pass through chat or the development environment.

1. **Create a Supabase access token:** in Supabase, click your avatar → **Account preferences** →
   **Access Tokens** → **Generate new token**. Name it `github-actions-lillyjean`, set an expiry you
   are comfortable with (e.g. one year) and copy it. You only see it once.
2. **Find the project reference:** Project Settings → General → **Project ID** (20 lowercase
   characters; also the first part of the project URL, `https://<project-id>.supabase.co`).
3. **Find the database password:** the password you chose when creating the project. If you no longer
   have it: Project Settings → Database → **Reset database password**. Nothing else uses it yet, so
   resetting is safe now.
4. **Create a GitHub environment:** in the repository, Settings → **Environments** → **New environment**
   → name it exactly `production` → **Configure environment**.
   - Optional: under **Deployment branches and tags**, choose "Selected branches and tags" and add
     `main`, so only `main` can use these secrets.
   - Optional: tick **Required reviewers** and add yourself if you want to approve every database
     change before it runs (a manual step per release).
5. **Add three environment secrets** (same page → **Environment secrets** → **Add environment secret**):

   | Name                    | Value                             |
   | ----------------------- | --------------------------------- |
   | `SUPABASE_ACCESS_TOKEN` | the access token from step 1      |
   | `SUPABASE_PROJECT_ID`   | the project reference from step 2 |
   | `SUPABASE_DB_PASSWORD`  | the database password from step 3 |

6. **Check it works (optional, recommended):** Actions tab → **Database deploy** → **Run workflow** on
   `main`. With no migrations yet it should link to the project and report that the remote database
   is up to date. A failure at "Link the production project" means a secret is wrong.
7. **Require the database check on `main` (optional):** add `Database` to the required status checks of
   the `Protect main` ruleset (Settings → Rules → Rulesets → Protect main → Require status checks →
   Add checks). `.github/rulesets/protect-main.json` already includes it for future imports.

Good to know:

- The workflow only runs when a merge to `main` changes files in `supabase/migrations`, or when you start
  it by hand.
- Vercel deploys the app at the same time. For a minute the new app can run against the old database,
  so migrations are written to be backwards compatible (add first, remove later).
- When the access token expires, the workflow fails at "Link the production project"; generate a new
  token and update the secret.

## 5. Accounts in production (Sprint 2)

Do these before you test Sprint 2 on production; the app only works with **codes**, never email links
(decision A3).

1. **Auth settings:** Authentication → Sign In / Providers → Email:
   - **Confirm email:** on;
   - **Secure email change:** **off**, so only the new address confirms an email change (decision A8);
   - **Secure password change:** on;
   - **Minimum password length:** 12;
   - **Email OTP length:** 6; **Email OTP expiration:** 900 seconds (the app says "valid for 15 minutes").
2. **Custom SMTP first** (see step 2 above): needed now. Without it, Supabase's built-in sender stops
   after a few emails per hour, and on the free plan new projects that use the built-in sender cannot
   edit the email templates at all (reported since June 2026). With your own SMTP the templates are
   editable on the free plan too.
3. **Email templates** (after SMTP): Authentication → Emails → Templates. For each template below, set the subject and
   replace the message body with the full contents of the file from the repository (they contain the
   code `{{ .Token }}` and no link):

   | Template             | Subject                                       | File                                   |
   | -------------------- | --------------------------------------------- | -------------------------------------- |
   | Confirm signup       | `Your Lillyjean code: confirm your email`     | `supabase/templates/confirmation.html` |
   | Magic link           | `Your Lillyjean login code`                   | `supabase/templates/magic_link.html`   |
   | Reset password       | `Your Lillyjean code: reset your password`    | `supabase/templates/recovery.html`     |
   | Change email address | `Your Lillyjean code: confirm your new email` | `supabase/templates/email_change.html` |

4. **Make yourself admin** after creating your own account in the app (Supabase → SQL Editor):

   ```sql
   update public.profiles set role = 'admin' where username = 'your-username';
   ```

   Settings then shows an **Admin** section with the feedback list.

5. **Daily clean-up:** the migration schedules a daily job (`purge-deleted-accounts`, via `pg_cron`)
   that removes accounts 14 days after deletion. Check it under Integrations → Cron after the first
   database deploy.

## 6. Testers

- [ ] Share the production URL with Jean and Lilly after Sprint 3 (decision D2).
- [ ] Ask them to "Add to Home Screen" so the app behaves like an installed app.

## Done when

- `main` is the protected default branch and CI runs on pull requests.
- Merging to `main` deploys to Vercel production and release-please opens a release PR.
- A test sign-up on production receives a 6-digit code by email within a minute (from Sprint 2).
- The **Database deploy** workflow can link to the production project.
