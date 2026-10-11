-- Sprint 3: track your books.
-- A shared book table (cached from Open Library / Google Books, or added by hand), each user's
-- status per book and every finished read. Decisions: P16 (statuses, optional percentage, work
-- level), P27 (manual entry), P28 (re-reads count again), T3 + T18 (book data and covers).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.book_source as enum ('openlibrary', 'google', 'manual');
create type public.book_status as enum ('want_to_read', 'reading', 'read');

-- ---------------------------------------------------------------------------
-- Books (shared by everyone; one row per work)
-- ---------------------------------------------------------------------------

create table public.books (
  id uuid primary key default gen_random_uuid(),
  source public.book_source not null,
  -- Open Library work key (OL45804W) or Google Books volume id; null for books added by hand.
  source_id text,
  title text not null constraint book_title check (char_length(title) between 1 and 300),
  authors text[] not null default '{}'
    constraint book_authors check (cardinality(authors) <= 20),
  description text constraint book_description check (char_length(description) <= 10000),
  cover_url text constraint book_cover_url check (cover_url ~ '^https://'),
  isbn text constraint book_isbn check (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  published_year integer constraint book_published_year check (published_year between 0 and 3000),
  google_rating numeric(2, 1) constraint book_google_rating check (google_rating between 0 and 5),
  google_ratings_count integer constraint book_google_ratings_count check (google_ratings_count >= 0),
  -- True once the detail lookup (description, Google rating) has run, so it runs only once.
  details_checked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint book_source_id unique (source, source_id),
  constraint book_manual_has_no_source_id check ((source = 'manual') = (source_id is null))
);

comment on table public.books is
  'Shared book records: cached search results (Open Library, Google Books) and books added by hand.';

-- ---------------------------------------------------------------------------
-- My books: one status per user and book
-- ---------------------------------------------------------------------------

create table public.user_books (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  status public.book_status not null,
  -- Optional percentage, only while reading (P16).
  progress smallint constraint user_book_progress check (progress between 0 and 100),
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, book_id),
  constraint user_book_progress_only_reading check (progress is null or status = 'reading')
);

create index user_books_status_idx on public.user_books (user_id, status, status_changed_at desc);
create index user_books_book_idx on public.user_books (book_id);

-- ---------------------------------------------------------------------------
-- Reads: every time a user finishes a book (re-reads count again, P28)
-- ---------------------------------------------------------------------------

create table public.reads (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  -- The app sends the reader's local date; one day of slack covers time zones ahead of UTC.
  finished_on date not null default current_date
    constraint read_finished_on check (finished_on between date '1900-01-01' and current_date + 1),
  created_at timestamptz not null default now()
);

create index reads_user_finished_idx on public.reads (user_id, finished_on);
create index reads_book_idx on public.reads (user_id, book_id);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Saves a book found in Open Library or Google Books and returns its id. Called by the server
-- with data it fetched itself. Existing values are never overwritten; empty fields are filled in,
-- so a later detail lookup can add the description and the Google rating.
create function public.save_external_book(
  p_source public.book_source,
  p_source_id text,
  p_title text,
  p_authors text[] default '{}',
  p_description text default null,
  p_cover_url text default null,
  p_isbn text default null,
  p_published_year integer default null,
  p_google_rating numeric default null,
  p_google_ratings_count integer default null,
  p_details_checked boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  book_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_source = 'manual' or p_source_id is null then
    raise exception 'external_book_required' using errcode = '22023';
  end if;

  insert into public.books as b (
    source, source_id, title, authors, description, cover_url, isbn, published_year,
    google_rating, google_ratings_count, details_checked
  )
  values (
    p_source, p_source_id, p_title, coalesce(p_authors, '{}'), p_description, p_cover_url, p_isbn,
    p_published_year, p_google_rating, p_google_ratings_count, p_details_checked
  )
  on conflict on constraint book_source_id do update set
    authors = case when cardinality(b.authors) = 0 then excluded.authors else b.authors end,
    description = coalesce(b.description, excluded.description),
    cover_url = coalesce(b.cover_url, excluded.cover_url),
    isbn = coalesce(b.isbn, excluded.isbn),
    published_year = coalesce(b.published_year, excluded.published_year),
    google_rating = coalesce(b.google_rating, excluded.google_rating),
    google_ratings_count = coalesce(b.google_ratings_count, excluded.google_ratings_count),
    details_checked = b.details_checked or excluded.details_checked
  returning b.id into book_id;

  return book_id;
end;
$$;

-- Saves a page of search results in one call; returns the book ids in the same order.
create function public.save_external_books(p_books jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[] := array[]::uuid[];
  book jsonb;
begin
  if jsonb_typeof(p_books) <> 'array' or jsonb_array_length(p_books) > 40 then
    raise exception 'invalid_books' using errcode = '22023';
  end if;

  for book in select value from jsonb_array_elements(p_books) loop
    ids := ids || public.save_external_book(
      (book ->> 'source')::public.book_source,
      book ->> 'source_id',
      book ->> 'title',
      coalesce(array(select jsonb_array_elements_text(coalesce(book -> 'authors', '[]'::jsonb))), '{}'),
      book ->> 'description',
      book ->> 'cover_url',
      book ->> 'isbn',
      (book ->> 'published_year')::integer,
      (book ->> 'google_rating')::numeric,
      (book ->> 'google_ratings_count')::integer,
      coalesce((book ->> 'details_checked')::boolean, false)
    );
  end loop;

  return ids;
end;
$$;

-- Adds a book by hand (P27) and puts it on the caller's shelf with the chosen status.
-- Choosing "read" records a read finished today.
create function public.add_manual_book(
  p_title text,
  p_authors text[],
  p_status public.book_status,
  p_isbn text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  book_id uuid;
begin
  if caller is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  insert into public.books (source, title, authors, isbn, description, created_by, details_checked)
  values ('manual', p_title, coalesce(p_authors, '{}'), p_isbn, p_description, caller, true)
  returning id into book_id;

  insert into public.user_books (user_id, book_id, status) values (caller, book_id, p_status);
  if p_status = 'read' then
    insert into public.reads (user_id, book_id) values (caller, book_id);
  end if;

  return book_id;
end;
$$;

-- Sets Want to read or Reading, with an optional percentage while reading. "Read" goes through
-- mark_book_read, because it records a read.
create function public.set_book_status(
  p_book_id uuid,
  p_status public.book_status,
  p_progress smallint default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_status = 'read' then
    raise exception 'use_mark_book_read' using errcode = '22023';
  end if;

  insert into public.user_books (book_id, status, progress)
  values (p_book_id, p_status, case when p_status = 'reading' then p_progress end)
  on conflict (user_id, book_id) do update set
    status = excluded.status,
    progress = excluded.progress,
    status_changed_at = case
      when public.user_books.status = excluded.status then public.user_books.status_changed_at
      else now()
    end;
end;
$$;

-- Marks a book as read on the given date (today by default) and returns the new read's id.
-- Also used for re-reads: every call adds a read that counts towards the pledge (P28).
create function public.mark_book_read(
  p_book_id uuid,
  p_finished_on date default current_date
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  read_id bigint;
begin
  insert into public.user_books (book_id, status, progress)
  values (p_book_id, 'read', null)
  on conflict (user_id, book_id) do update set
    status = 'read',
    progress = null,
    status_changed_at = now();

  insert into public.reads (book_id, finished_on)
  values (p_book_id, coalesce(p_finished_on, current_date))
  returning id into read_id;

  return read_id;
end;
$$;

-- Undo for mark_book_read: removes that read and puts back the previous status
-- (no previous status = the book was not on the shelf).
create function public.undo_mark_book_read(
  p_read_id bigint,
  p_previous_status public.book_status default null,
  p_previous_progress smallint default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  undone_book uuid;
begin
  delete from public.reads
  where id = p_read_id and user_id = (select auth.uid())
  returning book_id into undone_book;

  if undone_book is null then
    raise exception 'read_not_found' using errcode = 'P0002';
  end if;

  if p_previous_status is null then
    delete from public.user_books
    where user_id = (select auth.uid()) and book_id = undone_book;
  else
    update public.user_books set
      status = p_previous_status,
      progress = case when p_previous_status = 'reading' then p_previous_progress end,
      status_changed_at = now()
    where user_id = (select auth.uid()) and book_id = undone_book;
  end if;
end;
$$;

-- "Remove from my books": deletes the status and every read of the book, and returns what was
-- removed so the app can offer Undo (restore_my_book).
create function public.remove_my_book(p_book_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  removed jsonb;
begin
  select jsonb_build_object(
    'status', ub.status,
    'progress', ub.progress,
    'status_changed_at', ub.status_changed_at,
    'created_at', ub.created_at,
    'reads', coalesce((
      select jsonb_agg(jsonb_build_object('finished_on', r.finished_on, 'created_at', r.created_at)
                       order by r.finished_on)
      from public.reads r
      where r.user_id = caller and r.book_id = p_book_id
    ), '[]'::jsonb)
  )
  into removed
  from public.user_books ub
  where ub.user_id = caller and ub.book_id = p_book_id;

  if removed is null then
    raise exception 'book_not_on_shelf' using errcode = 'P0002';
  end if;

  delete from public.reads where user_id = caller and book_id = p_book_id;
  delete from public.user_books where user_id = caller and book_id = p_book_id;

  return removed;
end;
$$;

-- Undo for remove_my_book: puts the status and the reads back from the returned snapshot.
create function public.restore_my_book(p_book_id uuid, p_snapshot jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.user_books (book_id, status, progress, status_changed_at, created_at)
  values (
    p_book_id,
    (p_snapshot ->> 'status')::public.book_status,
    (p_snapshot ->> 'progress')::smallint,
    coalesce((p_snapshot ->> 'status_changed_at')::timestamptz, now()),
    coalesce((p_snapshot ->> 'created_at')::timestamptz, now())
  );

  insert into public.reads (book_id, finished_on, created_at)
  select p_book_id, (r ->> 'finished_on')::date, coalesce((r ->> 'created_at')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_snapshot -> 'reads', '[]'::jsonb)) as r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reads enable row level security;

-- Book records are shared: anyone signed in can read them. Writes go through the functions above.
create policy "Signed-in users read books"
  on public.books for select to authenticated
  using (true);

create policy "Users manage their own shelf"
  on public.user_books for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own reads"
  on public.reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (T10)
-- ---------------------------------------------------------------------------

revoke all on public.books, public.user_books, public.reads from anon, authenticated;

grant select on public.books to authenticated;

grant select, delete on public.user_books to authenticated;
grant insert (book_id, status, progress, status_changed_at, created_at) on public.user_books to authenticated;
grant update (status, progress, status_changed_at) on public.user_books to authenticated;

grant select, delete on public.reads to authenticated;
grant insert (book_id, finished_on, created_at) on public.reads to authenticated;
grant update (finished_on) on public.reads to authenticated;

revoke all on function
  public.save_external_book(public.book_source, text, text, text[], text, text, text, integer, numeric, integer, boolean),
  public.save_external_books(jsonb),
  public.add_manual_book(text, text[], public.book_status, text, text),
  public.set_book_status(uuid, public.book_status, smallint),
  public.mark_book_read(uuid, date),
  public.undo_mark_book_read(bigint, public.book_status, smallint),
  public.remove_my_book(uuid),
  public.restore_my_book(uuid, jsonb)
from public, anon, authenticated;

grant execute on function
  public.save_external_book(public.book_source, text, text, text[], text, text, text, integer, numeric, integer, boolean),
  public.save_external_books(jsonb),
  public.add_manual_book(text, text[], public.book_status, text, text),
  public.set_book_status(uuid, public.book_status, smallint),
  public.mark_book_read(uuid, date),
  public.undo_mark_book_read(bigint, public.book_status, smallint),
  public.remove_my_book(uuid),
  public.restore_my_book(uuid, jsonb)
to authenticated;
