-- Story 3: rotation settings, grid slots, and stored seasonal leads.
-- Weekly and monthly assignments are computed from these (src/lib/rotation.ts);
-- seasonal leads are random, so they're generated once per season and stored.

alter table public.households
  add column timezone text not null default 'UTC',
  add column rotation_size int check (rotation_size between 2 and 4),
  add column rotation_start date;

-- Week 1 of the rotation is the week (Monday start) the household was created.
update public.households
  set rotation_start = date_trunc('week', created_at at time zone 'UTC')::date;
alter table public.households
  alter column rotation_start set not null,
  alter column rotation_start set default date_trunc('week', now() at time zone 'UTC')::date;

-- Settings go through update_household_settings, which validates them.
drop policy "Admins can rename their households" on public.households;

-- Grid slot per space: in week w, member position (slot + w) mod size does it.
alter table public.space_templates add column rotation_offset int not null default 0;
update public.space_templates set rotation_offset = case name
  when 'Kitchen' then 0 when 'Dining Room' then 1 when 'Living Room' then 2
  when 'Stairs' then 3 when 'Hallways' then 0 when 'Bathroom 1' then 1
  when 'Bathroom 2' then 2 end;

alter table public.spaces add column rotation_offset int not null default 0
  check (rotation_offset between 0 and 3);
update public.spaces s set rotation_offset = t.rotation_offset
  from public.space_templates t where t.name = s.name;

create or replace function public.seed_household(hid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_space public.space_templates%rowtype;
  v_cadence public.cadence;
  v_space_id uuid;
  v_chore_id uuid;
begin
  if exists (select 1 from public.spaces where household_id = hid) then
    return;
  end if;

  for v_space in select * from public.space_templates order by position loop
    insert into public.spaces (household_id, name, position, rotation_offset)
    values (hid, v_space.name, v_space.position, v_space.rotation_offset)
    returning id into v_space_id;

    foreach v_cadence in array enum_range(null::public.cadence) loop
      insert into public.chores (household_id, space_id, cadence)
      values (hid, v_space_id, v_cadence)
      returning id into v_chore_id;

      insert into public.chore_items (household_id, chore_id, label, position)
      select hid, v_chore_id, t.label, t.position
      from public.checklist_templates t
      where t.template_key = v_space.template_key and t.cadence = v_cadence;
    end loop;
  end loop;
end;
$$;

create table public.seasonal_leads (
  household_id uuid not null references public.households (id) on delete cascade,
  season_start date not null,
  space_id uuid not null,
  user_id uuid not null,
  primary key (household_id, season_start, space_id),
  foreign key (space_id, household_id)
    references public.spaces (id, household_id) on delete cascade,
  foreign key (household_id, user_id)
    references public.household_members (household_id, user_id) on delete cascade
);

alter table public.seasonal_leads enable row level security;

create policy "Members can view seasonal leads"
  on public.seasonal_leads for select to authenticated
  using (public.is_household_member(household_id));

-- First day of the meteorological season containing a date:
-- Mar 1 (spring), Jun 1 (summer), Sep 1 (fall), Dec 1 (winter).
create function public.season_start_for(d date)
returns date language sql immutable set search_path = ''
as $$
  select make_date(
    extract(year from d)::int - case when extract(month from d) < 3 then 1 else 0 end,
    case when extract(month from d) in (12, 1, 2) then 12
         else ((extract(month from d)::int - 3) / 3) * 3 + 3 end,
    1);
$$;

-- Returns this season's start date (household time zone), dealing seasonal
-- leads when needed: shuffled spaces go round-robin to shuffled rotation
-- members, so no one leads more than one space more than anyone else. Leads
-- stay fixed for the season unless the rotation roster changes.
create function public.ensure_seasonal_leads(hid uuid)
returns date language plpgsql security definer set search_path = ''
as $$
declare
  v_season date;
  v_size int;
  v_roster uuid[];
  v_leads uuid[];
begin
  if not public.is_household_member(hid) then
    raise exception 'not_a_member';
  end if;

  select public.season_start_for((now() at time zone h.timezone)::date),
         coalesce(h.rotation_size, least(greatest(count(m.user_id)::int, 2), 4))
    into v_season, v_size
  from public.households h
  left join public.household_members m on m.household_id = h.id
  where h.id = hid
  group by h.id;

  -- Serialise per household so concurrent visits can't both deal leads.
  perform pg_advisory_xact_lock(hashtext('seasonal_leads:' || hid::text));

  select array_agg(user_id order by user_id) into v_roster
  from (select user_id from public.household_members
        where household_id = hid order by joined_at, user_id limit v_size) r;

  -- A lone member would end up leading everything; wait for roommates.
  if coalesce(array_length(v_roster, 1), 0) < 2 then
    return v_season;
  end if;

  select array_agg(distinct user_id order by user_id) into v_leads
  from public.seasonal_leads where household_id = hid and season_start = v_season;

  if v_leads = v_roster then
    return v_season;
  end if;

  delete from public.seasonal_leads where household_id = hid and season_start = v_season;

  with shuffled_members as (
    select m, row_number() over (order by random()) - 1 as i from unnest(v_roster) m
  ), shuffled_spaces as (
    select id, row_number() over (order by random()) - 1 as i
    from public.spaces where household_id = hid
  )
  insert into public.seasonal_leads (household_id, season_start, space_id, user_id)
  select hid, v_season, s.id, m.m
  from shuffled_spaces s
  join shuffled_members m on m.i = s.i % array_length(v_roster, 1);

  return v_season;
end;
$$;

create function public.update_household_settings(hid uuid, p_timezone text, p_rotation_size int)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_household_admin(hid) then
    raise exception 'not_admin';
  end if;
  -- posix/, right/ and Factory are Postgres-only aliases that browsers reject.
  if p_timezone ~ '^(posix|right)/' or p_timezone = 'Factory'
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid_timezone';
  end if;
  if p_rotation_size is not null and p_rotation_size not between 2 and 4 then
    raise exception 'invalid_rotation_size';
  end if;

  update public.households
    set timezone = p_timezone, rotation_size = p_rotation_size
    where id = hid;
end;
$$;

revoke execute on function
  public.ensure_seasonal_leads(uuid),
  public.update_household_settings(uuid, text, int)
from public, anon;

grant execute on function
  public.ensure_seasonal_leads(uuid),
  public.update_household_settings(uuid, text, int)
to authenticated;
