-- Moderación administrativa y trazabilidad de incidentes.

create table if not exists public.incident_admin_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incident_reports(id) on delete cascade,
  admin_profile_id uuid not null references public.profiles(id),
  action text not null,
  previous_status text,
  new_status text,
  previous_is_official boolean not null default false,
  new_is_official boolean not null default false,
  created_at timestamptz not null default now(),
  constraint incident_admin_actions_action_check check (
    action in ('approve', 'reject', 'mark_official', 'unmark_official', 'resolve')
  )
);

create index if not exists incident_admin_actions_incident_created_idx
  on public.incident_admin_actions (incident_id, created_at desc);

alter table public.incident_admin_actions enable row level security;

drop policy if exists "admins read incident actions" on public.incident_admin_actions;
create policy "admins read incident actions"
  on public.incident_admin_actions for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and lower(coalesce(profiles.role, '')) = 'admin'
    )
  );

grant select on public.incident_admin_actions to authenticated;

create or replace function public.admin_moderate_incident(
  p_incident_id uuid,
  p_action text
)
returns public.incident_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid;
  v_before public.incident_reports%rowtype;
  v_after public.incident_reports%rowtype;
begin
  select profiles.id
    into v_admin_profile_id
  from public.profiles
  where profiles.user_id = auth.uid()
    and lower(coalesce(profiles.role, '')) = 'admin'
  limit 1;

  if v_admin_profile_id is null then
    raise exception 'Acción permitida solo para administradores' using errcode = '42501';
  end if;

  select * into v_before
  from public.incident_reports
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'Incidente no encontrado' using errcode = 'P0002';
  end if;

  case p_action
    when 'approve' then
      update public.incident_reports
      set status = 'active', resolved_at = null, resolved_by = null
      where id = p_incident_id returning * into v_after;
    when 'reject' then
      update public.incident_reports
      set status = 'rechazado', is_official = false, resolved_at = null, resolved_by = null
      where id = p_incident_id returning * into v_after;
    when 'mark_official' then
      update public.incident_reports
      set status = 'active', is_official = true, resolved_at = null, resolved_by = null
      where id = p_incident_id returning * into v_after;
    when 'unmark_official' then
      update public.incident_reports
      set is_official = false
      where id = p_incident_id returning * into v_after;
    when 'resolve' then
      update public.incident_reports
      set status = 'resuelto', resolved_at = now(), resolved_by = v_admin_profile_id
      where id = p_incident_id returning * into v_after;
    else
      raise exception 'Acción de moderación no válida' using errcode = '22023';
  end case;

  insert into public.incident_admin_actions (
    incident_id,
    admin_profile_id,
    action,
    previous_status,
    new_status,
    previous_is_official,
    new_is_official
  ) values (
    p_incident_id,
    v_admin_profile_id,
    p_action,
    v_before.status,
    v_after.status,
    coalesce(v_before.is_official, false),
    coalesce(v_after.is_official, false)
  );

  return v_after;
end;
$$;

revoke all on function public.admin_moderate_incident(uuid, text) from public;
grant execute on function public.admin_moderate_incident(uuid, text) to authenticated;
