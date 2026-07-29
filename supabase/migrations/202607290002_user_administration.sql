-- Administración segura de usuarios y unificación de permisos.
-- `profiles.role` es el único campo de rol administrativo.
-- `profiles.user_type` conserva solo la clasificación pública del perfil.
-- `can_publish_events` es una capacidad independiente para actores autorizados.

alter table public.profiles
  add column if not exists can_publish_events boolean not null default false,
  add column if not exists account_status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id);

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check check (account_status in ('active', 'suspended'));

-- Recupera administradores guardados anteriormente en campos alternativos,
-- sin eliminar `user_type`, porque aún describe comercio/organización/servicio.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_type'
  ) then
    execute $sql$update public.profiles set role = 'admin' where user_type = 'admin' and coalesce(role, 'vecino') <> 'admin'$sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
  ) then
    execute $sql$update public.profiles set role = 'admin' where is_admin is true and coalesce(role, 'vecino') <> 'admin'$sql$;
  end if;

  update public.profiles set role = 'vecino' where role is null or role = '';
end;
$$;

create table if not exists public.user_admin_actions (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  admin_profile_id uuid not null references public.profiles(id),
  action text not null,
  previous_role text,
  new_role text,
  previous_account_status text,
  new_account_status text,
  previous_verification_status text,
  new_verification_status text,
  previous_can_publish_events boolean not null default false,
  new_can_publish_events boolean not null default false,
  created_at timestamptz not null default now(),
  constraint user_admin_actions_action_check check (
    action in ('verify', 'approve_actor', 'revoke_actor', 'assign_admin', 'remove_admin', 'suspend', 'reactivate')
  )
);

create index if not exists user_admin_actions_target_created_idx
  on public.user_admin_actions (target_profile_id, created_at desc);

alter table public.user_admin_actions enable row level security;

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and coalesce(account_status, 'active') = 'active'
  );
$$;

revoke all on function public.current_profile_is_admin() from public;
grant execute on function public.current_profile_is_admin() to authenticated;

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles"
  on public.profiles for select to authenticated
  using (public.current_profile_is_admin());

drop policy if exists "admins read user actions" on public.user_admin_actions;
create policy "admins read user actions"
  on public.user_admin_actions for select to authenticated
  using (public.current_profile_is_admin());

grant select on public.user_admin_actions to authenticated;

create or replace function public.admin_manage_profile(
  p_target_profile_id uuid,
  p_action text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid;
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_verified boolean;
begin
  select id into v_admin_profile_id
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin_profile_id is null then
    raise exception 'Acción permitida solo para administradores activos' using errcode = '42501';
  end if;

  select * into v_before
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  v_verified := v_before.verification_status = 'verified'
    or coalesce(v_before.verified, false)
    or v_before.verified_at is not null;

  case p_action
    when 'verify' then
      update public.profiles
      set verification_status = 'verified', verified = true, verified_at = coalesce(verified_at, now())
      where id = p_target_profile_id returning * into v_after;

    when 'approve_actor' then
      if not v_verified then
        raise exception 'Primero debes verificar a este usuario' using errcode = '22023';
      end if;
      update public.profiles set can_publish_events = true
      where id = p_target_profile_id returning * into v_after;

    when 'revoke_actor' then
      update public.profiles set can_publish_events = false
      where id = p_target_profile_id returning * into v_after;

    when 'assign_admin' then
      update public.profiles set role = 'admin'
      where id = p_target_profile_id returning * into v_after;

    when 'remove_admin' then
      if p_target_profile_id = v_admin_profile_id then
        raise exception 'No puedes quitar tus propios permisos administrativos' using errcode = '22023';
      end if;
      update public.profiles set role = 'vecino'
      where id = p_target_profile_id returning * into v_after;

    when 'suspend' then
      if p_target_profile_id = v_admin_profile_id then
        raise exception 'No puedes suspender tu propia cuenta' using errcode = '22023';
      end if;
      update public.profiles
      set account_status = 'suspended', suspended_at = now(), suspended_by = v_admin_profile_id
      where id = p_target_profile_id returning * into v_after;

    when 'reactivate' then
      update public.profiles
      set account_status = 'active', suspended_at = null, suspended_by = null
      where id = p_target_profile_id returning * into v_after;

    else
      raise exception 'Acción administrativa no válida' using errcode = '22023';
  end case;

  insert into public.user_admin_actions (
    target_profile_id,
    admin_profile_id,
    action,
    previous_role,
    new_role,
    previous_account_status,
    new_account_status,
    previous_verification_status,
    new_verification_status,
    previous_can_publish_events,
    new_can_publish_events
  ) values (
    p_target_profile_id,
    v_admin_profile_id,
    p_action,
    v_before.role,
    v_after.role,
    coalesce(v_before.account_status, 'active'),
    coalesce(v_after.account_status, 'active'),
    v_before.verification_status,
    v_after.verification_status,
    coalesce(v_before.can_publish_events, false),
    coalesce(v_after.can_publish_events, false)
  );

  return v_after;
end;
$$;

revoke all on function public.admin_manage_profile(uuid, text) from public;
grant execute on function public.admin_manage_profile(uuid, text) to authenticated;
