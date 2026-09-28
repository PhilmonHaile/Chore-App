-- Each person belongs to at most one household. The unique index is the hard
-- guarantee (it also stops two simultaneous create clicks); the functions check
-- first so callers get a clear 'already_in_household' error.

drop index public.household_members_user_id_idx;
create unique index household_members_one_household_per_user
  on public.household_members (user_id);

create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
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

create or replace function public.accept_invite(p_token uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.household_invites%rowtype;
  v_current uuid;
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

  select household_id into v_current
  from public.household_members where user_id = auth.uid();

  -- Joining the same household twice is a no-op; a different one is refused.
  if v_current = v_invite.household_id then
    return v_current;
  end if;
  if v_current is not null then
    raise exception 'already_in_household';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_invite.household_id, auth.uid(), 'member', public.current_display_name());

  return v_invite.household_id;
end;
$$;
