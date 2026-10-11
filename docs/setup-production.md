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
- [ ] **Protect `main`:** Settings → Rules → Rulesets → New branch ruleset for `main`:
  - require a pull request before merging;
  - require status checks: `Lint, typecheck, test, build` and `Conventional commits`;
  - block force pushes.
  - Note: release PRs opened by release-please use GitHub's built-in token, and GitHub does not start CI
    for those. Either add yourself as a bypass actor for the ruleset (simplest), or let **(dev)** switch
    release-please to a fine-grained personal access token stored as a repository secret.
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
- [ ] **Email templates:** Authentication → Emails → Templates. "Confirm signup", "Magic link" and "Reset
      password" must contain the 6-digit code `{{ .Token }}` (the app works with codes, not links;
      decision A3). **(dev)** provides the template text in Sprint 2.
- [ ] **Custom SMTP** (decision T13): Authentication → Emails → SMTP Settings. The built-in sender only
      allows a handful of emails per hour, which breaks sign-up codes during testing. Options:
  - a transactional email service with your **own domain** (e.g. Resend, Postmark): best delivery, needs
    DNS records on a domain you own;
  - a service that allows a **verified single sender address** without a domain (e.g. Brevo): quicker,
    but emails are more likely to land in spam.
    Check the provider's current free-tier limits before choosing.
- [ ] **(dev)** Link the repo to the project (`supabase link`) and apply migrations from Sprint 2 onwards.

## 3. Vercel project

- [ ] Import the GitHub repository at [vercel.com](https://vercel.com); framework preset Next.js;
      production branch `main`.
- [ ] Environment variables (Settings → Environment Variables), for Production and Preview:
  - `NEXT_PUBLIC_SUPABASE_URL` = project URL from step 2
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key from step 2
- [ ] Deploy and copy the production URL back into Supabase (step 2, URL configuration).
- [ ] Optional: a custom domain for the app (Settings → Domains). The free Hobby plan is meant for
      non-commercial use; fine for testing.

## 4. Testers

- [ ] Share the production URL with Jean and Lilly after Sprint 3 (decision D2).
- [ ] Ask them to "Add to Home Screen" so the app behaves like an installed app.

## Done when

- `main` is the protected default branch and CI runs on pull requests.
- Merging to `main` deploys to Vercel production and release-please opens a release PR.
- A test sign-up on production receives a 6-digit code by email within a minute.
