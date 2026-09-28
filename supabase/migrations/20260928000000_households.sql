-- Story 1: households, members, and invite links.
-- Writes that span tables (create household, accept invite) go through
-- security definer functions so RLS can stay strict on the tables themselves.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index household_invites_household_id_idx on public.household_invites (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- Membership helpers. Security definer so policies on household_members
-- can call them without recursing into their own RLS.
create function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create function public.is_household_admin(hid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'admin'
  );
$$;

create policy "Members can view their households"
  on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "Admins can rename their households"
  on public.households for update to authenticated
  using (public.is_household_admin(id))
  with check (public.is_household_admin(id));

create policy "Members can view fellow members"
  on public.household_members for select to authenticated
  using (public.is_household_member(household_id));

create policy "Admins can view invites"
  on public.household_invites for select to authenticated
  using (public.is_household_admin(household_id));

create policy "Admins can create invites"
  on public.household_invites for insert to authenticated
  with check (public.is_household_admin(household_id) and created_by = auth.uid());

create policy "Admins can revoke invites"
  on public.household_invites for update to authenticated
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

-- Default display name: the part of the signed-in user's email before the @.
create function public.current_display_name()
returns text language sql stable set search_path = ''
as $$
  select coalesce(nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''), 'Roommate');
$$;

create function public.create_household(p_name text)
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

  return v_id;
end;
$$;

-- Lets a signed-in invitee see which household a link is for, without
-- exposing the invites table.
create function public.get_invite(p_token uuid)
returns table (household_name text, is_valid boolean)
language sql stable security definer set search_path = ''
as $$
  select h.name, (i.revoked_at is null and i.expires_at > now())
  from public.household_invites i
  join public.households h on h.id = i.household_id
  where i.token = p_token;
$$;

create function public.accept_invite(p_token uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.household_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.household_invites where token = p_token;

  if not found then
    raise exception 'invalid_invite';
  end if;
  if v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'expired_invite';
  end if;

  -- Joining twice is a no-op; an existing admin keeps their role.
  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_invite.household_id, auth.uid(), 'member', public.current_display_name())
  on conflict (household_id, user_id) do nothing;

  return v_invite.household_id;
end;
$$;

revoke execute on function
  public.is_household_member(uuid),
  public.is_household_admin(uuid),
  public.current_display_name(),
  public.create_household(text),
  public.get_invite(uuid),
  public.accept_invite(uuid)
from public, anon;

grant execute on function
  public.is_household_member(uuid),
  public.is_household_admin(uuid),
  public.current_display_name(),
  public.create_household(text),
  public.get_invite(uuid),
  public.accept_invite(uuid)
to authenticated;
