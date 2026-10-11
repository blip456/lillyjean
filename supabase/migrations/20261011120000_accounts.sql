-- Sprint 2: accounts.
-- Profiles (username, admin role, soft delete), yearly reading pledges and in-app feedback.
-- Decisions: A6 (username rules), A9 (delete account), P15 (admin role), P29 (pledge), P32 (feedback).

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('user', 'admin');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Lowercase only, so uniqueness is case-insensitive by construction (A6).
  username text unique
    constraint username_format check (username ~ '^[a-z0-9._]{3,20}$'),
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  -- Set when an existing username is changed; drives the 30-day cooldown (A6).
  username_changed_at timestamptz,
  -- Soft delete (A9): set immediately, the account is purged 14 days later.
  deleted_at timestamptz
);

comment on table public.profiles is 'One row per auth user: username, role and lifecycle.';

-- Usernames that could be mistaken for the app or its staff.
create function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(name) = any (array[
    'admin', 'administrator', 'support', 'help', 'lillyjean', 'staff',
    'moderator', 'system', 'root', 'null', 'undefined', 'me', 'settings'
  ]);
$$;

-- Create a profile for every new auth user; the username is chosen in onboarding.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Username changes: reserved names and the 30-day cooldown.
create function public.guard_username_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is not distinct from old.username then
    return new;
  end if;

  if new.username is null then
    raise exception 'username_required' using errcode = 'check_violation';
  end if;

  if public.is_reserved_username(new.username) then
    raise exception 'username_reserved' using errcode = 'check_violation';
  end if;

  -- Choosing the first username (onboarding) does not start the cooldown.
  if old.username is not null then
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days' then
      raise exception 'username_cooldown' using errcode = 'check_violation';
    end if;
    new.username_changed_at := now();
  end if;

  return new;
end;
$$;

create trigger guard_username_change
  before update of username on public.profiles
  for each row execute function public.guard_username_change();

-- ---------------------------------------------------------------------------
-- Helpers used by policies and the app
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and deleted_at is null
  );
$$;

-- Live availability check in onboarding and settings. Usernames are public by design
-- (friends find each other by username), so this does not leak anything private.
create function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select name ~ '^[a-z0-9._]{3,20}$'
    and not public.is_reserved_username(name)
    and not exists (select 1 from public.profiles where username = name);
$$;

-- Soft delete the calling account (A9). The app signs the user out afterwards.
create function public.request_account_deletion()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set deleted_at = now()
  where id = (select auth.uid())
    and deleted_at is null;
$$;

-- Permanently remove accounts that were soft deleted more than 14 days ago (A9).
-- Deleting the auth user cascades to the profile and the user's own rows.
create function public.purge_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  delete from auth.users
  where id in (
    select id from public.profiles
    where deleted_at is not null
      and deleted_at < now() - interval '14 days'
  );
  get diagnostics purged = row_count;
  return purged;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading pledges (books only, one per year; no row = "no goal, just reading")
-- ---------------------------------------------------------------------------

create table public.reading_pledges (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  year integer not null constraint pledge_year check (year between 2000 and 2100),
  goal integer not null constraint pledge_goal check (goal between 1 and 999),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

-- ---------------------------------------------------------------------------
-- Feedback (P32): anyone signed in can send, only admins can read
-- ---------------------------------------------------------------------------

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  message text not null constraint feedback_length check (char_length(message) between 1 and 5000),
  app_version text not null default '',
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reading_pledges enable row level security;
alter table public.feedback enable row level security;

create policy "Users read their own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

create policy "Users manage their own pledges"
  on public.reading_pledges for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users send feedback as themselves"
  on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins read feedback"
  on public.feedback for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Grants (T10: nothing is exposed unless granted explicitly)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.reading_pledges, public.feedback from anon, authenticated;

grant select on public.profiles to authenticated;
-- Only the username is user-editable; role, deleted_at and timestamps are not.
grant update (username) on public.profiles to authenticated;

grant select, insert, update, delete on public.reading_pledges to authenticated;

grant select on public.feedback to authenticated;
grant insert (message, app_version) on public.feedback to authenticated;

revoke all on function
  public.is_reserved_username(text),
  public.handle_new_user(),
  public.guard_username_change(),
  public.is_admin(),
  public.username_available(text),
  public.request_account_deletion(),
  public.purge_deleted_accounts()
from public, anon, authenticated;

-- is_reserved_username runs inside the username trigger, i.e. as the signed-in user.
grant execute on function
  public.is_reserved_username(text),
  public.is_admin(),
  public.username_available(text),
  public.request_account_deletion()
to authenticated;

-- ---------------------------------------------------------------------------
-- Daily purge of soft-deleted accounts
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

select cron.schedule(
  'purge-deleted-accounts',
  '17 3 * * *',
  $$select public.purge_deleted_accounts();$$
);
