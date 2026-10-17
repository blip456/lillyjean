-- Personal challenges (Sprint 5).
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

create function pg_temp.claims_for(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, aud, role)
values
  ('61111111-1111-1111-1111-111111111111', 'challenge.owner@example.test', 'authenticated', 'authenticated'),
  ('62222222-2222-2222-2222-222222222222', 'challenge.other@example.test', 'authenticated', 'authenticated');

-- Seven books, saved as the database owner. b1–b5 are the candidates, b6 an own pick, b7 extra.
create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
do $$
begin
  for n in 1..7 loop
    with b as (
      insert into public.books (source, source_id, title)
      values ('openlibrary', 'OL9' || n || 'W', 'Book ' || n) returning id
    )
    insert into ids select 'b' || n, id from b;
  end loop;
end;
$$;

create function pg_temp.book(n int) returns uuid language sql as $$
  select id from ids where name = 'b' || n;
$$;
create function pg_temp.books(variadic ns int[]) returns uuid[] language sql as $$
  select array_agg(pg_temp.book(n)) from unnest(ns) n;
$$;
grant execute on function pg_temp.book(int), pg_temp.books(int[]) to authenticated;

-- As the owner ---------------------------------------------------------------------------

select pg_temp.claims_for('61111111-1111-1111-1111-111111111111');
set local role authenticated;

select throws_ok(
  $$select public.create_challenge('Too few', null, current_date, null, pg_temp.books(1, 2, 3, 4))$$,
  '23514',
  'challenge_too_few_candidates',
  'a challenge needs at least 5 candidate books'
);

select throws_ok(
  $$select public.create_challenge('Dupes', null, current_date, null, pg_temp.books(1, 1, 2, 3, 4))$$,
  '23514',
  'challenge_too_few_candidates',
  'the same book counts once'
);

select throws_ok(
  $$select public.create_challenge('Backwards', null, current_date, current_date - 1, pg_temp.books(1, 2, 3, 4, 5))$$,
  '23514',
  null,
  'the end date cannot be before the start date'
);

select throws_ok(
  $$select public.create_challenge('   ', null, current_date, null, pg_temp.books(1, 2, 3, 4, 5))$$,
  '23514',
  null,
  'a challenge needs a title'
);

-- A running challenge (started 10 days ago, ends in 10 days) and an upcoming one.
insert into ids select 'running', public.create_challenge(
  '  Summer classics ', ' A book older than 100 years ', current_date - 10, current_date + 10,
  pg_temp.books(1, 2, 3, 4, 5));
insert into ids select 'upcoming', public.create_challenge(
  'Next month', null, current_date + 5, null, pg_temp.books(1, 2, 3, 4, 5));

select is(
  (select row(owner_id, title, theme, kind)::text from public.challenges where id = (select id from ids where name = 'running')),
  row('61111111-1111-1111-1111-111111111111'::uuid, 'Summer classics', 'A book older than 100 years', 'personal')::text,
  'a new challenge belongs to its creator, with trimmed title and theme'
);

select is(
  (select count(*)::int from public.challenge_candidates where challenge_id = (select id from ids where name = 'running')),
  5,
  'the candidates are saved'
);

select is(
  (select count(*)::int from public.challenge_progress
   where challenge_id = (select id from ids where name = 'running') and book_id is null and completed_on is null),
  1,
  'the creator is a member without a pick'
);

select throws_ok(
  $$insert into public.challenges (title, starts_on) values ('Direct', current_date)$$,
  '42501',
  null,
  'challenges cannot be inserted directly'
);

select throws_ok(
  $$update public.challenge_members set book_id = pg_temp.book(1)$$,
  '42501',
  null,
  'picks cannot be changed directly'
);

-- Picking and completing ------------------------------------------------------------------

-- A read before the start does not count (P13).
select public.mark_book_read(pg_temp.book(1), current_date - 20);
select is(
  public.pick_challenge_book((select id from ids where name = 'running'), pg_temp.book(1)),
  null::date,
  'a book read before the start does not complete the challenge'
);

-- A re-read after the start completes it (P13: re-reads count).
select public.mark_book_read(pg_temp.book(1), current_date - 3);
select is(
  (select completed_on from public.challenge_progress where challenge_id = (select id from ids where name = 'running')),
  current_date - 3,
  'a read after the start completes the challenge'
);

select throws_ok(
  $$select public.pick_challenge_book((select id from ids where name = 'running'), pg_temp.book(2))$$,
  '42501',
  'challenge_completed',
  'a completed challenge keeps its pick'
);

select throws_ok(
  $$select public.delete_challenge((select id from ids where name = 'running'))$$,
  '42501',
  'challenge_completed',
  'a completed challenge cannot be deleted'
);

-- Undo of the read takes the completion back.
select public.undo_mark_book_read(
  (select max(id) from public.reads where book_id = pg_temp.book(1)), 'read');
select is(
  (select completed_on from public.challenge_progress where challenge_id = (select id from ids where name = 'running')),
  null::date,
  'undoing the read takes the completion back'
);

-- An own pick (not a candidate) that was already read inside the window completes at once (P51).
select public.mark_book_read(pg_temp.book(6), current_date - 1);
select is(
  public.pick_challenge_book((select id from ids where name = 'running'), pg_temp.book(6)),
  current_date - 1,
  'picking a book already read after the start completes the challenge right away'
);

-- One read completes every challenge the book is picked for (P10), once each has started.
select public.pick_challenge_book((select id from ids where name = 'upcoming'), pg_temp.book(6));
select is(
  (select completed_on from public.challenge_progress where challenge_id = (select id from ids where name = 'upcoming')),
  null::date,
  'a read before an upcoming challenge starts does not count for it'
);

-- Editing ---------------------------------------------------------------------------------

select throws_ok(
  $$select public.update_challenge((select id from ids where name = 'running'),
      'Renamed', 'A book older than 100 years', current_date - 10, current_date + 10, pg_temp.books(1, 2, 3, 4, 5))$$,
  '42501',
  'challenge_locked',
  'after the start the title is locked'
);

select throws_ok(
  $$select public.update_challenge((select id from ids where name = 'running'),
      'Summer classics', 'Another theme', current_date - 10, current_date + 10, pg_temp.books(1, 2, 3, 4, 5))$$,
  '42501',
  'challenge_locked',
  'after the start the theme is locked'
);

select lives_ok(
  $$select public.update_challenge((select id from ids where name = 'running'),
      'Summer classics', 'A book older than 100 years', current_date - 10, current_date + 30, pg_temp.books(2, 3, 4, 5, 7))$$,
  'after the start the dates and candidates can change'
);

select results_eq(
  $$select book_id from public.challenge_candidates
    where challenge_id = (select id from ids where name = 'running') order by book_id$$,
  $$select unnest(pg_temp.books(2, 3, 4, 5, 7)) order by 1$$,
  'the candidate list is replaced'
);

select throws_ok(
  $$select public.update_challenge((select id from ids where name = 'running'),
      'Summer classics', 'A book older than 100 years', current_date - 10, null, pg_temp.books(2, 3, 4, 5))$$,
  '23514',
  'challenge_too_few_candidates',
  'an edit still needs 5 candidates'
);

select lives_ok(
  $$select public.update_challenge((select id from ids where name = 'upcoming'),
      'Renamed before the start', 'New theme', current_date + 5, null, pg_temp.books(1, 2, 3, 4, 5))$$,
  'before the start everything can change'
);

-- Moving the start to after the read takes the completion back (derived, never stored).
select public.update_challenge((select id from ids where name = 'running'),
  'Summer classics', 'A book older than 100 years', current_date, current_date + 30, pg_temp.books(2, 3, 4, 5, 7));
select is(
  (select completed_on from public.challenge_progress where challenge_id = (select id from ids where name = 'running')),
  null::date,
  'moving the start date after the read takes the completion back'
);

-- An ended challenge: no late completion (P13) ------------------------------------------

reset role;
select pg_temp.claims_for('61111111-1111-1111-1111-111111111111');
set local role authenticated;
insert into ids select 'ended', public.create_challenge(
  'Last month', null, current_date - 40, current_date - 10, pg_temp.books(1, 2, 3, 4, 5));
reset role;
-- Picked during the challenge (as the database owner, since picking an ended challenge is refused).
update public.challenge_members set book_id = pg_temp.book(7), picked_at = now() - interval '30 days'
where challenge_id = (select id from ids where name = 'ended');
select pg_temp.claims_for('61111111-1111-1111-1111-111111111111');
set local role authenticated;

select public.mark_book_read(pg_temp.book(7), current_date - 20);
select is(
  (select completed_on from public.challenge_progress where challenge_id = (select id from ids where name = 'ended')),
  null::date,
  'a read entered after the end does not complete it, even with a finish date inside the window'
);

select throws_ok(
  $$select public.pick_challenge_book((select id from ids where name = 'ended'), pg_temp.book(2))$$,
  '42501',
  'challenge_ended',
  'an ended challenge cannot be picked for'
);

-- Another user ----------------------------------------------------------------------------

reset role;
select pg_temp.claims_for('62222222-2222-2222-2222-222222222222');
set local role authenticated;

select is((select count(*)::int from public.challenges), 0, 'a user does not see someone else''s challenges');

select throws_ok(
  $$select public.pick_challenge_book((select id from ids where name = 'running'), pg_temp.book(2))$$,
  'P0002',
  'challenge_not_found',
  'a user cannot pick a book in someone else''s challenge'
);

select throws_ok(
  $$select public.delete_challenge((select id from ids where name = 'upcoming'))$$,
  'P0002',
  'challenge_not_found',
  'a user cannot delete someone else''s challenge'
);

-- Deleting --------------------------------------------------------------------------------

reset role;
select pg_temp.claims_for('61111111-1111-1111-1111-111111111111');
set local role authenticated;
select public.delete_challenge((select id from ids where name = 'upcoming'));
reset role;

select ok(
  not exists (select 1 from public.challenge_members where challenge_id = (select id from ids where name = 'upcoming'))
  and not exists (select 1 from public.challenge_candidates where challenge_id = (select id from ids where name = 'upcoming')),
  'deleting a challenge removes its members and candidates'
);

select * from finish();
rollback;
