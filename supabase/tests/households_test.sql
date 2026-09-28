-- Story 1 database tests. Run with: npm run test:db (needs `supabase start`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bea@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'outsider@example.com');


-- RLS is on for every Story 1 table.
select ok(relrowsecurity, relname || ' has RLS enabled')
from pg_class
where oid in ('public.households'::regclass, 'public.household_members'::regclass, 'public.household_invites'::regclass)
order by relname;

set local role authenticated;

-- Admin creates a household and becomes its admin.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
create temp table ctx as select public.create_household('Maple Street') as hid;
grant select on ctx to authenticated;

select is(
  (select role from public.household_members where household_id = (select hid from ctx)),
  'admin', 'creator is the admin'
);

insert into public.household_invites (household_id) select hid from ctx;
select is((select count(*)::int from public.household_invites), 1, 'admin can create an invite');

create temp table link as select token from public.household_invites;
grant select on link to authenticated, anon;

-- Before joining, the invitee can't see the household but can preview the invite.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bea@example.com","role":"authenticated"}', true);
select is((select count(*)::int from public.households), 0, 'non-member cannot see the household');
select is(
  (select household_name from public.get_invite((select token from link))),
  'Maple Street', 'invitee can preview the invite'
);

-- Joining from the link makes them a member who sees the household.
select is(public.accept_invite((select token from link)), (select hid from ctx), 'accept_invite returns the household');
select is((select name from public.households), 'Maple Street', 'invitee sees the household after joining');
select is((select count(*)::int from public.household_members), 2, 'invitee sees both roommates');
select lives_ok(
  format('select public.accept_invite(%L)', (select token from link)),
  'joining twice is harmless'
);
select is((select count(*)::int from public.household_invites), 0, 'members cannot see invite tokens');
select throws_ok(
  format('insert into public.household_invites (household_id) values (%L)', (select hid from ctx)),
  '42501', null, 'members cannot create invites'
);

-- Members can't promote themselves, add members directly, or rename the household.
update public.household_members set role = 'admin'
  where user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select role from public.household_members where user_id = '00000000-0000-0000-0000-00000000000b'),
  'member', 'members cannot promote themselves'
);
select throws_ok(
  format($$insert into public.household_members (household_id, user_id, display_name)
           values (%L, '00000000-0000-0000-0000-00000000000c', 'x')$$, (select hid from ctx)),
  '42501', null, 'members cannot add members directly'
);
update public.households set name = 'Hijacked';
select is((select name from public.households), 'Maple Street', 'members cannot rename the household');

-- Bad or expired links are rejected.
select throws_ok(
  $$select public.accept_invite('11111111-1111-1111-1111-111111111111')$$,
  'P0001', 'invalid_invite', 'unknown token is rejected'
);

reset role;
update public.household_invites set revoked_at = now();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","email":"outsider@example.com","role":"authenticated"}', true);
select throws_ok(
  format('select public.accept_invite(%L)', (select token from link)),
  'P0001', 'expired_invite', 'revoked token is rejected'
);

reset role;
update public.household_invites set revoked_at = null, expires_at = now() - interval '1 minute';
set local role authenticated;
select throws_ok(
  format('select public.accept_invite(%L)', (select token from link)),
  'P0001', 'expired_invite', 'expired token is rejected'
);

-- Signed-out visitors can't call the functions at all.
set local role anon;
select throws_ok(
  format('select public.accept_invite(%L)', (select token from link)),
  '42501', null, 'anon cannot accept invites'
);
select throws_ok(
  $$select public.create_household('Nope')$$,
  '42501', null, 'anon cannot create households'
);

select * from finish();
rollback;
