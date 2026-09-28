-- One household per person (Story 3 bug fix). Run with: npm run test:db.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bea@example.com');

select ok(
  exists (select 1 from pg_indexes where indexname = 'household_members_one_household_per_user'
          and indexdef like 'CREATE UNIQUE INDEX%'),
  'members are unique per user'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
create temp table ctx as select public.create_household('Maple Street') as hid;

-- A second create (e.g. a double click) is refused and leaves nothing behind.
select throws_ok(
  $$select public.create_household('Maple Street')$$,
  'P0001', 'already_in_household', 'cannot create a second household'
);
select is((select count(*)::int from public.households), 1, 'only one household exists');

insert into public.household_invites (household_id) select hid from ctx;
create temp table link as select token from public.household_invites;

-- Bea has her own household, so she can't join Maple Street too.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bea@example.com","role":"authenticated"}', true);
select public.create_household('Oak Lane');
select throws_ok(
  format('select public.accept_invite(%L)', (select token from link)),
  'P0001', 'already_in_household', 'cannot join a second household'
);

-- The admin re-opening their own invite link is still harmless.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
select is(public.accept_invite((select token from link)), (select hid from ctx), 'joining your own household is a no-op');

-- The index is the backstop even if the function check is bypassed.
reset role;
select throws_ok(
  format($$insert into public.household_members (household_id, user_id, display_name)
           select id, '00000000-0000-0000-0000-00000000000a', 'x' from public.households where id <> %L$$,
         (select hid from ctx)),
  '23505', null, 'the database rejects a second membership outright'
);

select * from finish();
rollback;
