-- Sprint 4: readlists and stored covers.
-- Readlists are user-made collections of books, like playlists (P1, P19): a book can be in many
-- readlists; books are shown most recently added first (P40). Sharing with friends follows in Sprint 8
-- and will extend the policies below. Covers are copied once to Supabase Storage (T20).

-- ---------------------------------------------------------------------------
-- Readlists
-- ---------------------------------------------------------------------------

create table public.readlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null constraint readlist_name check (char_length(btrim(name)) between 1 and 60),
  description text constraint readlist_description check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  -- Changes when the list or its books change, so the overview shows recent lists first.
  updated_at timestamptz not null default now()
);

create index readlists_owner_idx on public.readlists (owner_id, updated_at desc);

comment on table public.readlists is 'User-made collections of books, like playlists.';

create table public.readlist_books (
  readlist_id uuid not null references public.readlists (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (readlist_id, book_id)
);

create index readlist_books_order_idx on public.readlist_books (readlist_id, added_at desc);
create index readlist_books_book_idx on public.readlist_books (book_id);

-- Keeps readlists.updated_at current when a list is renamed or its books change.
create function public.touch_readlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'readlists' then
    new.updated_at := now();
    return new;
  end if;

  update public.readlists
  set updated_at = now()
  where id = coalesce(new.readlist_id, old.readlist_id);
  return null;
end;
$$;

create trigger touch_readlist
  before update of name, description on public.readlists
  for each row execute function public.touch_readlist();

create trigger touch_readlist_books
  after insert or delete on public.readlist_books
  for each row execute function public.touch_readlist();

-- ---------------------------------------------------------------------------
-- Stored covers (T20): the path of the copy in the public `covers` bucket
-- ---------------------------------------------------------------------------

alter table public.books add column cover_path text
  constraint book_cover_path check (cover_path ~ '^[a-z0-9/_.-]{1,200}$');

comment on column public.books.cover_path is
  'Path of the stored copy in the public covers bucket; null until copied (cover_url is the source).';

-- Public bucket: covers are not personal, and a public URL can be cached by browsers and the CDN.
-- Only the server (secret key) writes to it; there are no insert/update policies for users.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.readlists enable row level security;
alter table public.readlist_books enable row level security;

create policy "Owners manage their readlists"
  on public.readlists for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Helper for the readlist_books policies (also used by sharing in Sprint 8).
create function public.owns_readlist(p_readlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.readlists
    where id = p_readlist_id and owner_id = (select auth.uid())
  );
$$;

create policy "Owners see the books in their readlists"
  on public.readlist_books for select to authenticated
  using ((select public.owns_readlist(readlist_id)));

create policy "Owners add books to their readlists"
  on public.readlist_books for insert to authenticated
  with check ((select public.owns_readlist(readlist_id)) and added_by = (select auth.uid()));

create policy "Owners remove books from their readlists"
  on public.readlist_books for delete to authenticated
  using ((select public.owns_readlist(readlist_id)));

-- ---------------------------------------------------------------------------
-- Grants (T10)
-- ---------------------------------------------------------------------------

revoke all on public.readlists, public.readlist_books from anon, authenticated;

grant select, delete on public.readlists to authenticated;
grant insert (name, description) on public.readlists to authenticated;
grant update (name, description) on public.readlists to authenticated;

grant select, delete on public.readlist_books to authenticated;
-- added_at may be sent back by Undo, so a removed book returns to its old place.
grant insert (readlist_id, book_id, added_at) on public.readlist_books to authenticated;

revoke all on function public.touch_readlist(), public.owns_readlist(uuid)
  from public, anon, authenticated;
grant execute on function public.owns_readlist(uuid) to authenticated;
