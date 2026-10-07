@AGENTS.md

# Project rules

- Read `docs/decisions.md` before changing architecture; add a new entry when a decision changes.
- Feature screens are built only after their wireframe in `docs/wireframes` is approved.
- Commits follow Conventional Commits with the scopes in `commitlint.config.mjs` (see CONTRIBUTING.md).
- All UI copy goes through next-intl (`messages/en.json`). Inputs have visible labels; never put example
  values in placeholders.
- Supabase: use `src/lib/supabase/{client,server}.ts`; validate auth on the server with `getClaims()`;
  every table gets RLS + explicit GRANTs in its migration.
- Before pushing: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.
