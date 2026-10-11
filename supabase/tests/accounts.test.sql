-- Security rules for profiles, pledges and feedback (Sprint 2).
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- Sets the JWT claims for auth.uid(). The role switch itself must be a top-level
-- `set local role` statement: a SET inside a function does not outlive the call.
create function pg_temp.claims_for(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.test_profiles() returns setof public.profiles language sql as $$
  select * from public.profiles
  where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );
$$;

-- Test users ---------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'reader@example.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'owner@example.test', 'authenticated', 'authenticated');

select is(
  (select count(*)::int from pg_temp.test_profiles()),
  3,
  'a profile is created for every new auth user'
);

-- Choosing a username as a signed-in user ---------------------------------------
-- Runs before any username change by the database owner, so the username trigger is
-- planned with the signed-in user's privileges (catches missing GRANTs).

select pg_temp.claims_for('11111111-1111-1111-1111-111111111111');
set local role authenticated;

select is(current_user::text, 'authenticated', 'tests run as the signed-in role');

update public.profiles set username = 'first.reader' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'first.reader',
  'a user can choose their username'
);

-- Set up the other users as the database owner --------------------------------

reset role;
update public.profiles set username = 'other_reader' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set username = 'the.owner', role = 'admin'
  where id = '33333333-3333-3333-3333-333333333333';

-- As a regular user ----------------------------------------------------------

select pg_temp.claims_for('11111111-1111-1111-1111-111111111111');
set local role authenticated;

select is(
  (select count(*)::int from public.profiles),
  1,
  'a user only sees their own profile'
);

select ok(public.username_available('fresh_name'), 'an unused username is available');
select ok(not public.username_available('other_reader'), 'a taken username is not available');
select ok(not public.username_available('Fresh_Name'), 'capitals are not valid');
select ok(not public.username_available('admin'), 'reserved names are not available');
select ok(not public.username_available('ab'), 'too short is not valid');

select lives_ok(
  $$update public.profiles set username = 'second.name' where id = '11111111-1111-1111-1111-111111111111'$$,
  'the first change after onboarding is allowed'
);

select throws_ok(
  $$update public.profiles set username = 'third.name' where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514',
  'username_cooldown',
  'a second change within 30 days is blocked'
);

select throws_ok(
  $$update public.profiles set username = 'support' where id = '11111111-1111-1111-1111-111111111111'$$,
  '23514',
  'username_reserved',
  'reserved usernames are rejected'
);

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'a user cannot make themselves admin'
);

select ok(not public.is_admin(), 'a regular user is not an admin');

update public.profiles set username = 'hijack' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select username from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'other_reader',
  'a user cannot change someone else''s username'
);

select pg_temp.claims_for('11111111-1111-1111-1111-111111111111');
set local role authenticated;

insert into public.reading_pledges (year, goal) values (2026, 24);
select is(
  (select goal from public.reading_pledges where year = 2026),
  24,
  'a user can set their own pledge'
);

select throws_ok(
  $$insert into public.reading_pledges (user_id, year, goal)
    values ('22222222-2222-2222-2222-222222222222', 2026, 5)$$,
  '42501',
  null,
  'a user cannot set a pledge for someone else'
);

insert into public.feedback (message, app_version) values ('The library card is lovely', '0.2.0');
select is(
  (select count(*)::int from public.feedback),
  0,
  'a regular user cannot read feedback, not even their own'
);

select throws_ok(
  $$insert into public.feedback (user_id, message) values ('22222222-2222-2222-2222-222222222222', 'spoofed')$$,
  '42501',
  null,
  'a user cannot send feedback in someone else''s name'
);

-- As the admin ----------------------------------------------------------------

reset role;
select pg_temp.claims_for('33333333-3333-3333-3333-333333333333');
set local role authenticated;

select ok(public.is_admin(), 'the admin role is recognised');
select ok(
  exists (select 1 from public.feedback where message = 'The library card is lovely'),
  'an admin reads all feedback'
);
select is(
  (select count(*)::int from pg_temp.test_profiles()),
  3,
  'an admin can see all profiles (for feedback authors)'
);

-- Account deletion --------------------------------------------------------------

reset role;
select pg_temp.claims_for('11111111-1111-1111-1111-111111111111');
set local role authenticated;
select public.request_account_deletion();
reset role;

select isnt(
  (select deleted_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  null,
  'requesting deletion soft deletes the account'
);

update public.profiles set deleted_at = now() - interval '15 days'
  where id = '11111111-1111-1111-1111-111111111111';
select ok(public.purge_deleted_accounts() >= 1, 'accounts deleted more than 14 days ago are purged');
select ok(
  not exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  'the purged account is gone'
);

select * from finish();
rollback;
