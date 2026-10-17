-- Sprint 5: personal challenges.
-- A challenge has a title, a theme, a start date, an optional end date and at least 5 candidate
-- books (P12). Members pick one book: a candidate or any other book (own pick, accepted at once,
-- P11). A challenge is completed when the member has a read of the picked book finished on or
-- after the start and not after the end (P13, re-reads included). Completion is derived from the
-- reads, never stored, so Undo, "Remove from my books" and changed dates always give the right
-- answer, and one read completes every challenge the book is picked for (P10).
-- In Sprint 5 every challenge is personal (only the creator is a member); official challenges
-- (Sprint 6) and challenges shared with friends (Sprint 8) extend `kind` and the policies.
-- All changes go through the functions below, which keep the rules (P49–P51).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'personal' constraint challenge_kind check (kind in ('personal')),
  title text not null constraint challenge_title check (char_length(btrim(title)) between 1 and 80),
  theme text constraint challenge_theme check (char_length(theme) <= 300),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_dates check (ends_on is null or ends_on >= starts_on)
);

create index challenges_owner_idx on public.challenges (owner_id, starts_on);

comment on table public.challenges is 'Reading challenges: read one book that fits the theme.';

create table public.challenge_candidates (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (challenge_id, book_id)
);

create index challenge_candidates_book_idx on public.challenge_candidates (book_id);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- The picked book: a candidate, or an own pick (any other book). A removed candidate stays a
  -- valid pick and then counts as an own pick (P13).
  book_id uuid references public.books (id) on delete set null,
  picked_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index challenge_members_user_idx on public.challenge_members (user_id, book_id);

-- ---------------------------------------------------------------------------
-- Progress: completion derived from reads
-- ---------------------------------------------------------------------------

-- One row per membership. completed_on is the first finish date of the picked book inside the
-- challenge window, or null. security_invoker: callers only see their own memberships and reads.
create view public.challenge_progress
with (security_invoker = true) as
select
  m.challenge_id,
  m.user_id,
  m.book_id,
  (
    select min(r.finished_on)
    from public.reads r
    where r.user_id = m.user_id
      and r.book_id = m.book_id
      and r.finished_on >= c.starts_on
      and (c.ends_on is null or r.finished_on <= c.ends_on)
      -- No late completion (P13): a read entered after the end does not count, even when its
      -- finish date is inside the window. One day of slack covers time zones.
      and (c.ends_on is null or r.created_at < c.ends_on + 2)
  ) as completed_on
from public.challenge_members m
join public.challenges c on c.id = m.challenge_id;

comment on view public.challenge_progress is
  'Per member: the picked book and the date the challenge was completed (null = not yet).';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenge_members
    where challenge_id = p_challenge_id and user_id = (select auth.uid())
  );
$$;

-- Checks a candidate list: at least 5 distinct books that exist (P12).
create function public.check_challenge_candidates(p_book_ids uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ids uuid[];
begin
  select coalesce(array_agg(distinct b.id), '{}')
  into ids
  from public.books b
  where b.id = any (coalesce(p_book_ids, '{}'));

  if cardinality(ids) < 5 then
    raise exception 'challenge_too_few_candidates' using errcode = '23514';
  end if;
  if cardinality(ids) > 100 then
    raise exception 'challenge_too_many_candidates' using errcode = '23514';
  end if;
  return ids;
end;
$$;

-- ---------------------------------------------------------------------------
-- Functions (the only way to change challenges)
-- ---------------------------------------------------------------------------

-- E6: creates a personal challenge with its candidates; the creator is its only member.
create function public.create_challenge(
  p_title text,
  p_theme text,
  p_starts_on date,
  p_ends_on date,
  p_book_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ids uuid[];
  new_id uuid;
begin
  if caller is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  ids := public.check_challenge_candidates(p_book_ids);

  insert into public.challenges (owner_id, title, theme, starts_on, ends_on)
  values (caller, btrim(p_title), nullif(btrim(p_theme), ''), p_starts_on, p_ends_on)
  returning id into new_id;

  insert into public.challenge_candidates (challenge_id, book_id)
  select new_id, unnest(ids);

  insert into public.challenge_members (challenge_id, user_id) values (new_id, caller);
  return new_id;
end;
$$;

-- E6 before the start, E8 after: the creator changes the challenge. After the start the title
-- and theme are locked (P49); the dates and candidates can change (P13). Candidates left out are
-- removed; picks of removed candidates stay (they count as own picks).
create function public.update_challenge(
  p_challenge_id uuid,
  p_title text,
  p_theme text,
  p_starts_on date,
  p_ends_on date,
  p_book_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.challenges;
  ids uuid[];
begin
  select * into current from public.challenges
  where id = p_challenge_id and owner_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;

  if current.starts_on <= current_date and (
    btrim(p_title) is distinct from current.title
    or nullif(btrim(p_theme), '') is distinct from current.theme
  ) then
    raise exception 'challenge_locked' using errcode = '42501';
  end if;

  ids := public.check_challenge_candidates(p_book_ids);

  update public.challenges set
    title = btrim(p_title),
    theme = nullif(btrim(p_theme), ''),
    starts_on = p_starts_on,
    ends_on = p_ends_on,
    updated_at = now()
  where id = p_challenge_id;

  delete from public.challenge_candidates
  where challenge_id = p_challenge_id and book_id <> all (ids);

  insert into public.challenge_candidates (challenge_id, book_id)
  select p_challenge_id, unnest(ids)
  on conflict do nothing;
end;
$$;

-- E4 ⋯ Delete: the creator deletes a challenge, but not one that is completed, so the completed
-- counter and the stamps on the library card stay (P50).
create function public.delete_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.challenges
    where id = p_challenge_id and owner_id = (select auth.uid())
  ) then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.challenge_progress
    where challenge_id = p_challenge_id and completed_on is not null
  ) then
    raise exception 'challenge_completed' using errcode = '42501';
  end if;

  delete from public.challenges where id = p_challenge_id;
end;
$$;

-- E4 "Add this book", E5 own pick, D2 "Add this book": sets my pick. Any book can be picked
-- (P11). A completed challenge keeps its pick; an ended one cannot be picked for any more. Returns the completion date: a read of the book
-- inside the window completes the challenge right away (P51).
create function public.pick_challenge_book(p_challenge_id uuid, p_book_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  done date;
begin
  select completed_on into done from public.challenge_progress
  where challenge_id = p_challenge_id and user_id = caller;
  if not found then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if done is not null then
    raise exception 'challenge_completed' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.challenges
    where id = p_challenge_id and ends_on < current_date - 1
  ) then
    raise exception 'challenge_ended' using errcode = '42501';
  end if;
  if not exists (select 1 from public.books where id = p_book_id) then
    raise exception 'book_not_found' using errcode = 'P0002';
  end if;

  update public.challenge_members
  set book_id = p_book_id, picked_at = now()
  where challenge_id = p_challenge_id and user_id = caller;

  select completed_on into done from public.challenge_progress
  where challenge_id = p_challenge_id and user_id = caller;
  return done;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.challenges enable row level security;
alter table public.challenge_candidates enable row level security;
alter table public.challenge_members enable row level security;

create policy "Members see their challenges"
  on public.challenges for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_challenge_member(id)));

create policy "Members see the candidates"
  on public.challenge_candidates for select to authenticated
  using ((select public.is_challenge_member(challenge_id)));

create policy "Members see their own membership"
  on public.challenge_members for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (T10): read only; every change goes through the functions above.
-- ---------------------------------------------------------------------------

revoke all on public.challenges, public.challenge_candidates, public.challenge_members,
  public.challenge_progress from anon, authenticated;

grant select on public.challenges, public.challenge_candidates, public.challenge_members,
  public.challenge_progress to authenticated;

revoke all on function
  public.is_challenge_member(uuid),
  public.check_challenge_candidates(uuid[]),
  public.create_challenge(text, text, date, date, uuid[]),
  public.update_challenge(uuid, text, text, date, date, uuid[]),
  public.delete_challenge(uuid),
  public.pick_challenge_book(uuid, uuid)
  from public, anon, authenticated;

grant execute on function
  public.is_challenge_member(uuid),
  public.create_challenge(text, text, date, date, uuid[]),
  public.update_challenge(uuid, text, text, date, date, uuid[]),
  public.delete_challenge(uuid),
  public.pick_challenge_book(uuid, uuid)
  to authenticated;
