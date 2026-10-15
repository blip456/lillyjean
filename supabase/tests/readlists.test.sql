-- Readlists and stored covers (Sprint 4).
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.claims_for(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, aud, role)
values
  ('51111111-1111-1111-1111-111111111111', 'list.owner@example.test', 'authenticated', 'authenticated'),
  ('52222222-2222-2222-2222-222222222222', 'list.other@example.test', 'authenticated', 'authenticated');

-- Two shared books, saved as the database owner.
create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
with b as (insert into public.books (source, source_id, title) values ('openlibrary', 'OL7001W', 'First Book') returning id)
insert into ids select 'first', id from b;
with b as (insert into public.books (source, source_id, title) values ('openlibrary', 'OL7002W', 'Second Book') returning id)
insert into ids select 'second', id from b;

-- As the owner --------------------------------------------------------------------------

select pg_temp.claims_for('51111111-1111-1111-1111-111111111111');
set local role authenticated;

with r as (insert into public.readlists (name, description) values ('Winter reads', 'Cosy books') returning id)
insert into ids select 'list', id from r;

select is(
  (select owner_id from public.readlists where id = (select id from ids where name = 'list')),
  '51111111-1111-1111-1111-111111111111'::uuid,
  'a new readlist belongs to its creator'
);

select throws_ok(
  $$insert into public.readlists (name) values ('   ')$$,
  '23514',
  null,
  'a readlist needs a name'
);

select throws_ok(
  $$insert into public.readlists (name) values (repeat('x', 61))$$,
  '23514',
  null,
  'a readlist name has at most 60 characters'
);

select throws_ok(
  $$insert into public.readlists (owner_id, name) values ('52222222-2222-2222-2222-222222222222', 'Hijack')$$,
  '42501',
  null,
  'a user cannot create a readlist for someone else'
);

-- Make the list look old (as the database owner), then add a book as the owner of the list.
reset role;
update public.readlists set updated_at = now() - interval '1 day'
  where id = (select id from ids where name = 'list');
select pg_temp.claims_for('51111111-1111-1111-1111-111111111111');
set local role authenticated;

insert into public.readlist_books (readlist_id, book_id)
values ((select id from ids where name = 'list'), (select id from ids where name = 'first'));

select ok(
  (select updated_at > now() - interval '1 minute' from public.readlists where id = (select id from ids where name = 'list')),
  'adding a book marks the readlist as updated'
);

select is(
  (select added_by from public.readlist_books where book_id = (select id from ids where name = 'first')),
  '51111111-1111-1111-1111-111111111111'::uuid,
  'the book is recorded as added by the owner'
);

insert into public.readlist_books (readlist_id, book_id, added_at)
values ((select id from ids where name = 'list'), (select id from ids where name = 'second'), now() + interval '1 second');

select results_eq(
  $$select b.title from public.readlist_books rb join public.books b on b.id = rb.book_id
    where rb.readlist_id = (select id from ids where name = 'list') order by rb.added_at desc$$,
  $$values ('Second Book'::text), ('First Book'::text)$$,
  'books are listed most recently added first'
);

select throws_ok(
  $$insert into public.readlist_books (readlist_id, book_id)
    values ((select id from ids where name = 'list'), (select id from ids where name = 'first'))$$,
  '23505',
  null,
  'a book is in a readlist only once'
);

with r as (insert into public.readlists (name) values ('Spanish writers') returning id)
insert into ids select 'list2', id from r;
insert into public.readlist_books (readlist_id, book_id)
values ((select id from ids where name = 'list2'), (select id from ids where name = 'first'));
select is(
  (select count(*)::int from public.readlist_books where book_id = (select id from ids where name = 'first')),
  2,
  'a book can be in many readlists'
);

update public.readlists set name = 'Winter favourites' where id = (select id from ids where name = 'list');
select is(
  (select name from public.readlists where id = (select id from ids where name = 'list')),
  'Winter favourites',
  'the owner can rename a readlist'
);

select throws_ok(
  $$update public.readlists set owner_id = '52222222-2222-2222-2222-222222222222'
    where id = (select id from ids where name = 'list')$$,
  '42501',
  null,
  'the owner cannot be changed'
);

delete from public.readlist_books
where readlist_id = (select id from ids where name = 'list')
  and book_id = (select id from ids where name = 'second');
select is(
  (select count(*)::int from public.readlist_books where readlist_id = (select id from ids where name = 'list')),
  1,
  'the owner can remove a book from a readlist'
);

-- Another user ---------------------------------------------------------------------------

reset role;
select pg_temp.claims_for('52222222-2222-2222-2222-222222222222');
set local role authenticated;

select is((select count(*)::int from public.readlists), 0, 'a user does not see someone else''s readlists');
select is((select count(*)::int from public.readlist_books), 0, 'a user does not see the books in someone else''s readlists');

select throws_ok(
  $$insert into public.readlist_books (readlist_id, book_id)
    values ((select id from ids where name = 'list'), (select id from ids where name = 'second'))$$,
  '42501',
  null,
  'a user cannot add books to someone else''s readlist'
);

delete from public.readlists where id = (select id from ids where name = 'list');
reset role;
select is(
  (select count(*)::int from public.readlists where id = (select id from ids where name = 'list')),
  1,
  'a user cannot delete someone else''s readlist'
);

-- Deleting a readlist --------------------------------------------------------------------

select pg_temp.claims_for('51111111-1111-1111-1111-111111111111');
set local role authenticated;
delete from public.readlists where id = (select id from ids where name = 'list');
reset role;

select ok(
  not exists (select 1 from public.readlist_books where readlist_id = (select id from ids where name = 'list')),
  'deleting a readlist removes its book entries'
);
select is(
  (select count(*)::int from public.books where id in (select id from ids where name in ('first', 'second'))),
  2,
  'deleting a readlist keeps the books themselves'
);

-- Stored covers --------------------------------------------------------------------------

select is(
  (select public from storage.buckets where id = 'covers'),
  true,
  'the covers bucket is public for reading'
);

select pg_temp.claims_for('51111111-1111-1111-1111-111111111111');
set local role authenticated;
select throws_ok(
  $$update public.books set cover_path = 'ol/x.jpg' where id = (select id from ids where name = 'first')$$,
  '42501',
  null,
  'users cannot set where a cover is stored'
);

select * from finish();
rollback;
