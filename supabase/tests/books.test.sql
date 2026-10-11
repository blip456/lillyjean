-- Books, shelves and reads (Sprint 3).
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

create function pg_temp.claims_for(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, aud, role)
values
  ('41111111-1111-1111-1111-111111111111', 'shelf.reader@example.test', 'authenticated', 'authenticated'),
  ('42222222-2222-2222-2222-222222222222', 'shelf.other@example.test', 'authenticated', 'authenticated');

-- Saving books from the book databases ------------------------------------------

select pg_temp.claims_for('41111111-1111-1111-1111-111111111111');
set local role authenticated;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

insert into ids
select 'novel', public.save_external_book(
  'openlibrary', 'OL1W', 'A Shared Novel', array['First Author'], null, null, '9780000000002', 1999
);

select is(
  public.save_external_book('openlibrary', 'OL1W', 'A Different Title', array['Someone Else'],
                            'Now with a description', null, null, null, 4.2, 10, true),
  (select id from ids where name = 'novel'),
  'saving the same work again returns the same book'
);

select results_eq(
  $$select title, authors, description, google_rating, details_checked
    from public.books where id = (select id from ids where name = 'novel')$$,
  $$values ('A Shared Novel'::text, array['First Author']::text[], 'Now with a description'::text,
            4.2::numeric(2, 1), true)$$,
  'existing values are kept and empty ones are filled in'
);

select is(
  (public.save_external_books($$[
    {"source": "openlibrary", "source_id": "OL1W", "title": "A Shared Novel"},
    {"source": "google", "source_id": "gvol-9", "title": "Page Two", "authors": ["Third Author"]}
  ]$$::jsonb))[1],
  (select id from ids where name = 'novel'),
  'a page of results is saved in one call, in order'
);

select is(
  (select authors from public.books where source = 'google' and source_id = 'gvol-9'),
  array['Third Author'],
  'authors are saved from a page of results'
);

select throws_ok(
  $$select public.save_external_book('manual', null, 'Sneaky')$$,
  '22023',
  'external_book_required',
  'save_external_book cannot create manual books'
);

select throws_ok(
  $$insert into public.books (source, title) values ('manual', 'Direct insert')$$,
  '42501',
  null,
  'books cannot be inserted directly'
);

select throws_ok(
  $$update public.books set title = 'Vandalised' where id = (select id from ids where name = 'novel')$$,
  '42501',
  null,
  'books cannot be changed directly'
);

-- Statuses -------------------------------------------------------------------------

select lives_ok(
  $$select public.set_book_status((select id from ids where name = 'novel'), 'want_to_read')$$,
  'a user can put a book on their shelf as Want to read'
);

select public.set_book_status((select id from ids where name = 'novel'), 'reading', 40::smallint);
select results_eq(
  $$select status::text, progress::int from public.user_books
    where book_id = (select id from ids where name = 'novel')$$,
  $$values ('reading'::text, 40)$$,
  'Reading keeps the optional percentage'
);

select public.set_book_status((select id from ids where name = 'novel'), 'want_to_read', 70::smallint);
select is(
  (select progress from public.user_books where book_id = (select id from ids where name = 'novel')),
  null,
  'a percentage is only kept while reading'
);

select throws_ok(
  $$select public.set_book_status((select id from ids where name = 'novel'), 'reading', 101::smallint)$$,
  '23514',
  null,
  'the percentage is at most 100'
);

select throws_ok(
  $$select public.set_book_status((select id from ids where name = 'novel'), 'read')$$,
  '22023',
  'use_mark_book_read',
  'Read goes through mark_book_read'
);

-- Marking as read, re-reads and undo ----------------------------------------------------

select public.set_book_status((select id from ids where name = 'novel'), 'reading', 55::smallint);

create temp table read_ids (name text primary key, id bigint);
grant all on read_ids to authenticated;

insert into read_ids
select 'first', public.mark_book_read((select id from ids where name = 'novel'), date '2026-03-01');

select results_eq(
  $$select status::text, progress from public.user_books
    where book_id = (select id from ids where name = 'novel')$$,
  $$values ('read'::text, null::smallint)$$,
  'marking as read sets the status to Read and clears the percentage'
);

select is(
  (select finished_on from public.reads where id = (select id from read_ids where name = 'first')),
  date '2026-03-01',
  'the read keeps the chosen finish date'
);

insert into read_ids
select 'again', public.mark_book_read((select id from ids where name = 'novel'));

select is(
  (select count(*)::int from public.reads where book_id = (select id from ids where name = 'novel')),
  2,
  'a re-read counts again'
);

select is(
  (select finished_on from public.reads where id = (select id from read_ids where name = 'again')),
  current_date,
  'the finish date defaults to today'
);

select throws_ok(
  $$select public.mark_book_read((select id from ids where name = 'novel'), current_date + 30)$$,
  '23514',
  null,
  'a finish date in the future is rejected'
);

select public.undo_mark_book_read((select id from read_ids where name = 'again'), 'reading', 55::smallint);
select results_eq(
  $$select ub.status::text, ub.progress::int,
           (select count(*)::int from public.reads r where r.book_id = ub.book_id)
    from public.user_books ub where ub.book_id = (select id from ids where name = 'novel')$$,
  $$values ('reading'::text, 55, 1)$$,
  'undo removes that read and restores the previous status and percentage'
);

-- A second book that was not on the shelf before marking it as read.
insert into ids
select 'fresh', public.save_external_book('google', 'gvol-1', 'A Fresh Book', array['Second Author']);
insert into read_ids
select 'fresh', public.mark_book_read((select id from ids where name = 'fresh'));
select public.undo_mark_book_read((select id from read_ids where name = 'fresh'));
select ok(
  not exists (select 1 from public.user_books where book_id = (select id from ids where name = 'fresh')),
  'undo without a previous status takes the book off the shelf again'
);

-- Another user ------------------------------------------------------------------------

reset role;
select pg_temp.claims_for('42222222-2222-2222-2222-222222222222');
set local role authenticated;

select is(
  (select count(*)::int from public.books where id = (select id from ids where name = 'novel')),
  1,
  'book records are shared with everyone signed in'
);
select is((select count(*)::int from public.user_books), 0, 'a user does not see someone else''s shelf');
select is((select count(*)::int from public.reads), 0, 'a user does not see someone else''s reads');

select throws_ok(
  $$select public.undo_mark_book_read((select id from read_ids where name = 'first'))$$,
  'P0002',
  'read_not_found',
  'a user cannot undo someone else''s read'
);

select throws_ok(
  $$insert into public.user_books (user_id, book_id, status)
    values ('41111111-1111-1111-1111-111111111111', (select id from ids where name = 'novel'), 'read')$$,
  '42501',
  null,
  'a user cannot put books on someone else''s shelf'
);

select throws_ok(
  $$select public.remove_my_book((select id from ids where name = 'novel'))$$,
  'P0002',
  'book_not_on_shelf',
  'removing a book that is not on your shelf fails'
);

-- Remove from my books and undo --------------------------------------------------------

reset role;
select pg_temp.claims_for('41111111-1111-1111-1111-111111111111');
set local role authenticated;

create temp table snapshots (name text primary key, snapshot jsonb);
grant all on snapshots to authenticated;

insert into snapshots
select 'novel', public.remove_my_book((select id from ids where name = 'novel'));

select ok(
  not exists (select 1 from public.user_books where book_id = (select id from ids where name = 'novel'))
  and not exists (select 1 from public.reads where book_id = (select id from ids where name = 'novel')),
  'removing a book deletes its status and its reads'
);

select is(
  (select jsonb_array_length(snapshot -> 'reads') from snapshots where name = 'novel'),
  1,
  'the removed reads are returned for Undo'
);

select public.restore_my_book(
  (select id from ids where name = 'novel'),
  (select snapshot from snapshots where name = 'novel')
);
select results_eq(
  $$select ub.status::text, ub.progress::int,
           (select min(r.finished_on) from public.reads r where r.book_id = ub.book_id)
    from public.user_books ub where ub.book_id = (select id from ids where name = 'novel')$$,
  $$values ('reading'::text, 55, date '2026-03-01')$$,
  'undo restores the status, percentage and reads'
);

-- Books added by hand ------------------------------------------------------------------

insert into ids
select 'manual', public.add_manual_book('My Own Find', array['Small Press Author'], 'read');

select results_eq(
  $$select b.source::text, b.created_by, ub.status::text,
           (select count(*)::int from public.reads r where r.book_id = b.id)
    from public.books b join public.user_books ub on ub.book_id = b.id
    where b.id = (select id from ids where name = 'manual')$$,
  $$values ('manual'::text, '41111111-1111-1111-1111-111111111111'::uuid, 'read'::text, 1)$$,
  'a manual book is saved, put on the shelf and Read records a read'
);

select throws_ok(
  $$select public.add_manual_book('', array['Nobody'], 'want_to_read')$$,
  '23514',
  null,
  'a manual book needs a title'
);

-- Not signed in ------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $$select public.save_external_book('openlibrary', 'OL2W', 'Anonymous')$$,
  '42501',
  null,
  'visitors cannot save books'
);

select throws_ok(
  $$select count(*) from public.books$$,
  '42501',
  null,
  'visitors cannot read books'
);

select * from finish();
rollback;
