-- Story 2: each household's own copy of the spaces and checklists.
-- A chore is one space's checklist for one cadence (e.g. Kitchen weekly).
-- Read-only for members in this story; editing comes later.

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  position int not null,
  unique (household_id, name),
  unique (id, household_id)
);

-- Composite foreign keys keep household_id consistent down the chain: a chore
-- belongs to its space's household, and an item to its chore's household.
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  space_id uuid not null,
  cadence public.cadence not null,
  unique (space_id, cadence),
  unique (id, household_id),
  foreign key (space_id, household_id)
    references public.spaces (id, household_id) on delete cascade
);

create table public.chore_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  chore_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 200),
  position int not null,
  unique (chore_id, position),
  foreign key (chore_id, household_id)
    references public.chores (id, household_id) on delete cascade
);

create index spaces_household_id_idx on public.spaces (household_id);
create index chores_household_id_idx on public.chores (household_id);
create index chore_items_household_id_idx on public.chore_items (household_id);

alter table public.spaces enable row level security;
alter table public.chores enable row level security;
alter table public.chore_items enable row level security;

create policy "Members can view spaces"
  on public.spaces for select to authenticated
  using (public.is_household_member(household_id));

create policy "Members can view chores"
  on public.chores for select to authenticated
  using (public.is_household_member(household_id));

create policy "Members can view chore items"
  on public.chore_items for select to authenticated
  using (public.is_household_member(household_id));

-- 1 point per checklist item, whatever the cadence. security_invoker keeps
-- the underlying tables' RLS in force for whoever queries the view.
create view public.chore_points with (security_invoker = true) as
  select c.id as chore_id, c.household_id, count(i.id)::int as points
  from public.chores c
  left join public.chore_items i on i.chore_id = c.id
  group by c.id, c.household_id;

grant select on public.chore_points to authenticated;

-- Copies the default spaces and checklists into a household. Does nothing if
-- the household already has spaces, so it's safe to run more than once.
create function public.seed_household(hid uuid)
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
    insert into public.spaces (household_id, name, position)
    values (hid, v_space.name, v_space.position)
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

revoke execute on function public.seed_household(uuid) from public, anon, authenticated;

-- New households now start with the default spaces and checklists.
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_id, auth.uid(), 'admin', public.current_display_name());

  perform public.seed_household(v_id);

  return v_id;
end;
$$;

-- Backfill households created before this migration.
select public.seed_household(id) from public.households;
