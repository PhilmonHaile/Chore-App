-- Story 3 database tests. Run with: npm run test:db (needs `supabase start`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bea@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cam@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'outsider@example.com');

-- Season boundaries (pure date function).
select results_eq(
  $$select public.season_start_for(d::date) from unnest(array[
    '2026-02-28', '2026-03-01', '2026-05-31', '2026-06-01', '2026-08-31',
    '2026-09-01', '2026-11-30', '2026-12-01', '2027-01-15']) d$$,
  $$values ('2025-12-01'::date), ('2026-03-01'), ('2026-03-01'), ('2026-06-01'), ('2026-06-01'),
           ('2026-09-01'), ('2026-09-01'), ('2026-12-01'), ('2026-12-01')$$,
  'seasons start Mar 1, Jun 1, Sep 1 and Dec 1'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
create temp table ctx as select public.create_household('Maple Street') as hid;
insert into public.household_invites (household_id) select hid from ctx;
create temp table link as select token from public.household_invites;

-- An admin alone doesn't get locked in as lead of everything.
select public.ensure_seasonal_leads((select hid from ctx));
select is((select count(*)::int from public.seasonal_leads), 0, 'no leads are dealt with only one member');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bea@example.com","role":"authenticated"}', true);
select public.accept_invite((select token from link));
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","email":"cam@example.com","role":"authenticated"}', true);
select public.accept_invite((select token from link));

-- Defaults and grid slots.
select is((select timezone from public.households), 'UTC', 'time zone defaults to UTC');
select is((select extract(isodow from rotation_start)::int from public.households), 1, 'rotation starts on a Monday');
select results_eq(
  'select name, rotation_offset from public.spaces order by position',
  $$values ('Kitchen', 0), ('Bathroom 1', 1), ('Bathroom 2', 2), ('Living Room', 2),
           ('Dining Room', 1), ('Stairs', 3), ('Hallways', 0)$$,
  'spaces get their PRD grid slots'
);

-- Seasonal leads: dealt evenly, then fixed for the season.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.seasonal_leads'::regclass),
  'seasonal_leads has RLS enabled'
);
create temp table season as select public.ensure_seasonal_leads((select hid from ctx)) as start;
select is((select start from season), public.season_start_for(current_date), 'returns the current season start');
select is((select count(*)::int from public.seasonal_leads), 7, 'every space gets a seasonal lead');
select ok(
  (select max(n) - min(n) <= 1 from (select count(*) as n from public.seasonal_leads group by user_id) c)
  and (select count(distinct user_id) from public.seasonal_leads) = 3,
  'leads are spread evenly across all 3 roommates'
);
create temp table first_leads as select space_id, user_id from public.seasonal_leads;
select public.ensure_seasonal_leads((select hid from ctx));
select set_eq(
  'select space_id, user_id from public.seasonal_leads',
  'select space_id, user_id from first_leads',
  'leads do not change on later visits in the same season'
);

-- Only the admin can change settings, and only to valid values.
select throws_ok(
  format($$select public.update_household_settings(%L, 'America/New_York', 3)$$, (select hid from ctx)),
  'P0001', 'not_admin', 'members cannot change settings'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
select throws_ok(
  format($$select public.update_household_settings(%L, 'Mars/Olympus_Mons', null)$$, (select hid from ctx)),
  'P0001', 'invalid_timezone', 'unknown time zones are rejected'
);
select throws_ok(
  format($$select public.update_household_settings(%L, 'posix/America/New_York', null)$$, (select hid from ctx)),
  'P0001', 'invalid_timezone', 'Postgres-only time zone aliases are rejected'
);
select throws_ok(
  format($$select public.update_household_settings(%L, 'UTC', 5)$$, (select hid from ctx)),
  'P0001', 'invalid_rotation_size', 'sizes outside 2-4 are rejected'
);
select public.update_household_settings((select hid from ctx), 'America/New_York', 2);
select is(
  (select timezone || ' / ' || rotation_size from public.households),
  'America/New_York / 2', 'admin can set time zone and household size'
);

-- Changing the roster re-deals leads among the new rotation members.
-- Everyone joined in this one transaction (same now()), so join order falls back
-- to user_id: keep the test uuids sorting a < b < c.
select public.ensure_seasonal_leads((select hid from ctx));
select is(
  (select array_agg(distinct user_id order by user_id) from public.seasonal_leads),
  array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[],
  'leads are re-dealt to the first 2 members after the size drops to 2'
);
select is((select count(*)::int from public.seasonal_leads), 7, 're-dealing still covers every space');

update public.households set rotation_start = '2020-01-06';
select isnt((select rotation_start from public.households), '2020-01-06'::date, 'rotation start cannot be edited directly');

-- Outsiders can't generate or read leads.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","email":"outsider@example.com","role":"authenticated"}', true);
select throws_ok(
  format('select public.ensure_seasonal_leads(%L)', (select hid from ctx)),
  'P0001', 'not_a_member', 'non-members cannot generate leads'
);
select is((select count(*)::int from public.seasonal_leads), 0, 'non-members cannot read leads');

select * from finish();
rollback;
