-- Alcance territorial administrativo y nivel de superadministración.
--
-- Compatibilidad:
--   * Todo administrador conserva profiles.role = 'admin'.
--   * profiles.is_superadmin = true habilita alcance global.
--   * Un admin normal solo puede consultar y actuar dentro de su barrio.
--   * La migración NO promueve automáticamente ninguna cuenta.

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_superadmin_requires_admin;

alter table public.profiles
  add constraint profiles_superadmin_requires_admin
  check (not is_superadmin or role = 'admin');

alter table public.user_admin_actions
  add column if not exists previous_is_superadmin boolean not null default false,
  add column if not exists new_is_superadmin boolean not null default false;

alter table public.user_admin_actions
  drop constraint if exists user_admin_actions_action_check;

alter table public.user_admin_actions
  add constraint user_admin_actions_action_check check (
    action in (
      'verify',
      'approve_actor',
      'revoke_actor',
      'assign_admin',
      'remove_admin',
      'assign_superadmin',
      'remove_superadmin',
      'suspend',
      'reactivate'
    )
  );

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and coalesce(account_status, 'active') = 'active'
  );
$$;

create or replace function public.current_profile_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and is_superadmin is true
      and coalesce(account_status, 'active') = 'active'
  );
$$;

create or replace function public.current_admin_can_manage_neighborhood(
  p_neighborhood_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and coalesce(account_status, 'active') = 'active'
      and (
        is_superadmin is true
        or (
          neighborhood_id is not null
          and neighborhood_id = p_neighborhood_id
        )
      )
  );
$$;

revoke all on function public.current_profile_is_admin() from public;
revoke all on function public.current_profile_is_superadmin() from public;
revoke all on function public.current_admin_can_manage_neighborhood(uuid) from public;
grant execute on function public.current_profile_is_admin() to authenticated;
grant execute on function public.current_profile_is_superadmin() to authenticated;
grant execute on function public.current_admin_can_manage_neighborhood(uuid) to authenticated;

drop policy if exists "admins read all profiles" on public.profiles;
drop policy if exists "admins read neighborhood profiles" on public.profiles;
create policy "admins read neighborhood profiles"
  on public.profiles for select to authenticated
  using (
    public.current_profile_is_superadmin()
    or public.current_admin_can_manage_neighborhood(neighborhood_id)
  );

drop policy if exists "admins read user actions" on public.user_admin_actions;
create policy "admins read user actions"
  on public.user_admin_actions for select to authenticated
  using (
    exists (
      select 1
      from public.profiles target
      where target.id = user_admin_actions.target_profile_id
        and public.current_admin_can_manage_neighborhood(target.neighborhood_id)
    )
  );

drop policy if exists "admins read incident actions" on public.incident_admin_actions;
create policy "admins read incident actions"
  on public.incident_admin_actions for select to authenticated
  using (
    exists (
      select 1
      from public.incident_reports incident
      where incident.id = incident_admin_actions.incident_id
        and public.current_admin_can_manage_neighborhood(incident.neighborhood_id)
    )
  );

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
  v_admin public.profiles%rowtype;
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_verified boolean;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acción permitida solo para administradores activos' using errcode = '42501';
  end if;

  select * into v_before
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  if not v_admin.is_superadmin
    and (
      v_admin.neighborhood_id is null
      or v_before.neighborhood_id is distinct from v_admin.neighborhood_id
    ) then
    raise exception 'No puedes administrar usuarios de otro barrio' using errcode = '42501';
  end if;

  if v_before.is_superadmin and not v_admin.is_superadmin then
    raise exception 'Solo un superadministrador puede modificar esta cuenta' using errcode = '42501';
  end if;

  if v_before.role = 'admin'
    and not v_admin.is_superadmin
    and p_target_profile_id <> v_admin.id then
    raise exception 'Solo un superadministrador puede modificar otra cuenta administrativa' using errcode = '42501';
  end if;

  if p_action in ('assign_admin', 'remove_admin', 'assign_superadmin', 'remove_superadmin')
    and not v_admin.is_superadmin then
    raise exception 'Solo un superadministrador puede administrar permisos administrativos' using errcode = '42501';
  end if;

  v_verified := v_before.verification_status = 'verified'
    or coalesce(v_before.verified, false)
    or v_before.verified_at is not null;

  case p_action
    when 'verify' then
      update public.profiles
      set verification_status = 'verified',
          verified = true,
          verified_at = coalesce(verified_at, now())
      where id = p_target_profile_id
      returning * into v_after;

    when 'approve_actor' then
      if not v_verified then
        raise exception 'Primero debes verificar a este usuario' using errcode = '22023';
      end if;
      update public.profiles
      set can_publish_events = true
      where id = p_target_profile_id
      returning * into v_after;

    when 'revoke_actor' then
      update public.profiles
      set can_publish_events = false
      where id = p_target_profile_id
      returning * into v_after;

    when 'assign_admin' then
      update public.profiles
      set role = 'admin'
      where id = p_target_profile_id
      returning * into v_after;

    when 'remove_admin' then
      if p_target_profile_id = v_admin.id then
        raise exception 'No puedes quitar tus propios permisos administrativos' using errcode = '22023';
      end if;
      if v_before.is_superadmin then
        raise exception 'Primero debes retirar el nivel de superadministrador' using errcode = '22023';
      end if;
      update public.profiles
      set role = 'vecino',
          is_superadmin = false
      where id = p_target_profile_id
      returning * into v_after;

    when 'assign_superadmin' then
      update public.profiles
      set role = 'admin',
          is_superadmin = true
      where id = p_target_profile_id
      returning * into v_after;

    when 'remove_superadmin' then
      if p_target_profile_id = v_admin.id then
        raise exception 'No puedes retirar tu propio nivel de superadministrador' using errcode = '22023';
      end if;
      update public.profiles
      set is_superadmin = false
      where id = p_target_profile_id
      returning * into v_after;

    when 'suspend' then
      if p_target_profile_id = v_admin.id then
        raise exception 'No puedes suspender tu propia cuenta' using errcode = '22023';
      end if;
      update public.profiles
      set account_status = 'suspended',
          suspended_at = now(),
          suspended_by = v_admin.id
      where id = p_target_profile_id
      returning * into v_after;

    when 'reactivate' then
      update public.profiles
      set account_status = 'active',
          suspended_at = null,
          suspended_by = null
      where id = p_target_profile_id
      returning * into v_after;

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
    new_can_publish_events,
    previous_is_superadmin,
    new_is_superadmin
  ) values (
    p_target_profile_id,
    v_admin.id,
    p_action,
    v_before.role,
    v_after.role,
    coalesce(v_before.account_status, 'active'),
    coalesce(v_after.account_status, 'active'),
    v_before.verification_status,
    v_after.verification_status,
    coalesce(v_before.can_publish_events, false),
    coalesce(v_after.can_publish_events, false),
    coalesce(v_before.is_superadmin, false),
    coalesce(v_after.is_superadmin, false)
  );

  return v_after;
end;
$$;

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
  v_admin public.profiles%rowtype;
  v_before public.incident_reports%rowtype;
  v_after public.incident_reports%rowtype;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acción permitida solo para administradores activos' using errcode = '42501';
  end if;

  select * into v_before
  from public.incident_reports
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'Incidente no encontrado' using errcode = 'P0002';
  end if;

  if not v_admin.is_superadmin
    and (
      v_admin.neighborhood_id is null
      or v_before.neighborhood_id is distinct from v_admin.neighborhood_id
    ) then
    raise exception 'No puedes moderar incidentes de otro barrio' using errcode = '42501';
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
      set status = 'resuelto', resolved_at = now(), resolved_by = v_admin.id
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
    v_admin.id,
    p_action,
    v_before.status,
    v_after.status,
    coalesce(v_before.is_official, false),
    coalesce(v_after.is_official, false)
  );

  return v_after;
end;
$$;

create or replace function public.admin_send_notification(
  p_target_profile_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_notification_id uuid;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Solo un administrador activo puede enviar notificaciones' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id;

  if not found then
    raise exception 'El perfil destinatario no existe' using errcode = 'P0002';
  end if;

  if not v_admin.is_superadmin
    and (
      v_admin.neighborhood_id is null
      or v_target.neighborhood_id is distinct from v_admin.neighborhood_id
    ) then
    raise exception 'No puedes notificar usuarios de otro barrio' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_title, ''))) not between 3 and 90 then
    raise exception 'El título debe tener entre 3 y 90 caracteres' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_body, ''))) not between 3 and 300 then
    raise exception 'El mensaje debe tener entre 3 y 300 caracteres' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, from_user_id, type, title, body, read)
  values (v_target.id, v_admin.id, 'system', trim(p_title), trim(p_body), false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.admin_get_user_activity(
  p_target_profile_id uuid
)
returns table (
  activity_type text,
  title text,
  detail text,
  created_at timestamptz,
  reference_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_target public.profiles%rowtype;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acción permitida solo para administradores activos' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id;

  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  if not v_admin.is_superadmin
    and (
      v_admin.neighborhood_id is null
      or v_target.neighborhood_id is distinct from v_admin.neighborhood_id
    ) then
    raise exception 'No puedes consultar actividad de otro barrio' using errcode = '42501';
  end if;

  return query
  select activity.activity_type, activity.title, activity.detail, activity.created_at, activity.reference_id
  from (
    select
      case post.type
        when 'sell' then 'sale'
        when 'gift' then 'gift'
        when 'trade' then 'trade'
        when 'service' then 'service'
        when 'event' then 'event'
        else 'post'
      end::text as activity_type,
      coalesce(post.title, 'Publicación sin título')::text as title,
      concat_ws(
        ' · ',
        nullif(post.status, ''),
        case when post.price is not null then '$' || trim(to_char(post.price, 'FM999G999G999')) end
      )::text as detail,
      post.created_at,
      post.id as reference_id
    from public.posts post
    where post.author_id = p_target_profile_id

    union all

    select
      'comment'::text,
      'Comentó en una publicación'::text,
      coalesce(comment.content, 'Comentario sin texto')::text,
      comment.created_at,
      comment.id
    from public.comments comment
    where comment.author_id = p_target_profile_id

    union all

    select
      'alert'::text,
      coalesce(incident.title, 'Reportó una alerta')::text,
      concat_ws(' · ', incident.category, incident.status)::text,
      incident.created_at,
      incident.id
    from public.incident_reports incident
    where incident.reporter_id = p_target_profile_id

    union all

    select
      'opinion'::text,
      'Opinó sobre un comercio'::text,
      concat_ws(' · ', review.rating::text || ' estrellas', nullif(review.comment, ''))::text,
      review.created_at,
      review.id
    from public.commerce_reviews review
    where review.reviewer_id = p_target_profile_id
       or (review.reviewer_id is null and review.author_id = p_target_profile_id)
  ) activity
  order by activity.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_super_notification_audience_counts(
  p_neighborhood_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_result jsonb;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and is_superadmin is true
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acceso de superadministrador requerido' using errcode = '42501';
  end if;
  if p_neighborhood_id is null
    or not exists (select 1 from public.neighborhoods where id = p_neighborhood_id) then
    raise exception 'Selecciona un barrio válido' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'all', count(*) filter (where true),
    'verified', count(*) filter (
      where p.verification_status = 'verified'
        or coalesce(p.verified, false)
        or p.verified_at is not null
    ),
    'actors', count(*) filter (where coalesce(p.can_publish_events, false)),
    'commerces', count(*) filter (
      where p.user_type in ('business', 'commerce', 'comercio')
        or exists (select 1 from public.commerces c where c.owner_id = p.id)
    )
  ) into v_result
  from public.profiles p
  where p.neighborhood_id = p_neighborhood_id
    and coalesce(p.account_status, 'active') <> 'suspended';

  return v_result;
end;
$$;

create or replace function public.admin_super_send_broadcast_notification(
  p_neighborhood_id uuid,
  p_audience text,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_campaign_id uuid;
  v_count integer := 0;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and is_superadmin is true
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acceso de superadministrador requerido' using errcode = '42501';
  end if;
  if p_neighborhood_id is null
    or not exists (select 1 from public.neighborhoods where id = p_neighborhood_id) then
    raise exception 'Selecciona un barrio válido' using errcode = '22023';
  end if;
  if p_audience not in ('all', 'verified', 'commerces', 'actors') then
    raise exception 'Audiencia no válida' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 3 and 90 then
    raise exception 'El título debe tener entre 3 y 90 caracteres' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_body, ''))) not between 3 and 300 then
    raise exception 'El mensaje debe tener entre 3 y 300 caracteres' using errcode = '22023';
  end if;

  insert into public.notification_campaigns (
    admin_profile_id,
    neighborhood_id,
    audience,
    title,
    body
  ) values (
    v_admin.id,
    p_neighborhood_id,
    p_audience,
    trim(p_title),
    trim(p_body)
  )
  returning id into v_campaign_id;

  insert into public.notifications (
    user_id,
    from_user_id,
    type,
    title,
    body,
    read,
    related_id
  )
  select
    p.id,
    v_admin.id,
    'system',
    trim(p_title),
    trim(p_body),
    false,
    v_campaign_id
  from public.profiles p
  where p.neighborhood_id = p_neighborhood_id
    and coalesce(p.account_status, 'active') <> 'suspended'
    and (
      p_audience = 'all'
      or (
        p_audience = 'verified'
        and (
          p.verification_status = 'verified'
          or coalesce(p.verified, false)
          or p.verified_at is not null
        )
      )
      or (p_audience = 'actors' and coalesce(p.can_publish_events, false))
      or (
        p_audience = 'commerces'
        and (
          p.user_type in ('business', 'commerce', 'comercio')
          or exists (select 1 from public.commerces c where c.owner_id = p.id)
        )
      )
    );

  get diagnostics v_count = row_count;

  update public.notification_campaigns
  set recipient_count = v_count
  where id = v_campaign_id;

  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'recipient_count', v_count
  );
end;
$$;

create or replace function public.admin_super_list_notification_campaigns(
  p_neighborhood_id uuid
)
returns table (
  id uuid,
  audience text,
  title text,
  body text,
  recipient_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_profile_is_superadmin() then
    raise exception 'Acceso de superadministrador requerido' using errcode = '42501';
  end if;
  if p_neighborhood_id is null
    or not exists (select 1 from public.neighborhoods where id = p_neighborhood_id) then
    raise exception 'Selecciona un barrio válido' using errcode = '22023';
  end if;

  return query
  select
    campaign.id,
    campaign.audience,
    campaign.title,
    campaign.body,
    campaign.recipient_count,
    campaign.created_at
  from public.notification_campaigns campaign
  where campaign.neighborhood_id = p_neighborhood_id
  order by campaign.created_at desc
  limit 100;
end;
$$;

revoke all on function public.admin_manage_profile(uuid, text) from public;
revoke all on function public.admin_moderate_incident(uuid, text) from public;
revoke all on function public.admin_send_notification(uuid, text, text) from public;
revoke all on function public.admin_get_user_activity(uuid) from public;
revoke all on function public.admin_super_notification_audience_counts(uuid) from public;
revoke all on function public.admin_super_send_broadcast_notification(uuid, text, text, text) from public;
revoke all on function public.admin_super_list_notification_campaigns(uuid) from public;
grant execute on function public.admin_manage_profile(uuid, text) to authenticated;
grant execute on function public.admin_moderate_incident(uuid, text) to authenticated;
grant execute on function public.admin_send_notification(uuid, text, text) to authenticated;
grant execute on function public.admin_get_user_activity(uuid) to authenticated;
grant execute on function public.admin_super_notification_audience_counts(uuid) to authenticated;
grant execute on function public.admin_super_send_broadcast_notification(uuid, text, text, text) to authenticated;
grant execute on function public.admin_super_list_notification_campaigns(uuid) to authenticated;
