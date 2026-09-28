-- Story 2 database tests. Run with: npm run test:db (needs `supabase start`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'outsider@example.com');

-- RLS is on for every Story 2 table.
select ok(relrowsecurity, relname || ' has RLS enabled')
from pg_class
where oid in (
  'public.spaces'::regclass, 'public.chores'::regclass, 'public.chore_items'::regclass,
  'public.space_templates'::regclass, 'public.checklist_templates'::regclass
)
order by relname;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"admin@example.com","role":"authenticated"}', true);
create temp table ctx as select public.create_household('Maple Street') as hid;
grant select on ctx to authenticated;

-- A new household loads all 7 spaces with weekly, monthly and seasonal checklists.
select results_eq(
  'select name from public.spaces order by position',
  $$values ('Kitchen'), ('Bathroom 1'), ('Bathroom 2'), ('Living Room'), ('Dining Room'), ('Stairs'), ('Hallways')$$,
  'household has the 7 spaces in order'
);
select is((select count(*)::int from public.chores), 21, 'each space has 3 chores');
select is((select count(*)::int from public.chore_items), 153, 'all checklist items are copied');

-- Points are 1 per item.
create temp view pts as
  select s.name, c.cadence::text as cadence, p.points
  from public.chore_points p
  join public.chores c on c.id = p.chore_id
  join public.spaces s on s.id = c.space_id;
grant select on pts to authenticated;

select is((select points from pts where name = 'Kitchen' and cadence = 'weekly'), 15, 'Kitchen weekly is 15 points');
select is((select points from pts where name = 'Bathroom 2' and cadence = 'monthly'), 8, 'Bathroom 2 monthly is 8 points');
select is((select points from pts where name = 'Stairs' and cadence = 'weekly'), 6, 'Stairs weekly is 6 points');
select is((select sum(points)::int from pts), 153, 'total points equal total items');

-- Read-only: members can't change checklists or reseed, and templates aren't exposed.
select throws_ok(
  format($$insert into public.spaces (household_id, name, position) values (%L, 'Garage', 8)$$, (select hid from ctx)),
  '42501', null, 'members cannot add spaces'
);
select throws_ok(
  format('select public.seed_household(%L)', (select hid from ctx)),
  '42501', null, 'members cannot call seed_household'
);
select is((select count(*)::int from public.checklist_templates), 0, 'templates are not readable through the API');

-- Other households can't see these checklists.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","email":"outsider@example.com","role":"authenticated"}', true);
select is((select count(*)::int from public.chore_items), 0, 'non-members see no chore items');
select is((select count(*)::int from public.chore_points), 0, 'non-members see no points');

reset role;
select is(
  (select string_agg(i.label, ' | ' order by i.position) from public.chore_items i
   join public.chores c on c.id = i.chore_id join public.spaces s on s.id = c.space_id
   where s.household_id = (select hid from ctx) and s.name = 'Kitchen' and c.cadence = 'weekly'
     and i.position <= 2),
  'Wipe and disinfect the countertops | Scrub and disinfect the sink',
  'items keep the PRD order'
);

-- Seeding twice doesn't duplicate anything.
select public.seed_household(hid) from ctx;
select is(
  (select count(*)::int from public.spaces where household_id = (select hid from ctx)),
  7, 'seed_household is idempotent'
);

-- Rows can't point at another household's space or chore.
insert into public.households (id, name) values ('22222222-2222-2222-2222-222222222222', 'Other House');
insert into public.spaces (household_id, name, position) select hid, 'Garage', 8 from ctx;
select throws_ok(
  $$insert into public.chores (household_id, space_id, cadence)
    select '22222222-2222-2222-2222-222222222222', id, 'weekly' from public.spaces where name = 'Garage'$$,
  '23503', null, 'a chore must share its space''s household'
);
select throws_ok(
  $$insert into public.chore_items (household_id, chore_id, label, position)
    select '22222222-2222-2222-2222-222222222222', id, 'x', 99 from public.chores limit 1$$,
  '23503', null, 'an item must share its chore''s household'
);

select * from finish();
rollback;
