-- Stored covers (T20): the server copies a cover to the `covers` bucket and records where it is
-- stored. That runs with the secret key (service_role). Supabase grants service_role everything by
-- default; state the one column it writes explicitly (T10), so the app does not depend on it.

grant select, update (cover_path) on public.books to service_role;
