create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.profiles(id),
  neighborhood_id uuid not null references public.neighborhoods(id),
  audience text not null check (audience in ('all', 'verified', 'commerces', 'actors')),
  title text not null,
  body text not null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists notification_campaigns_neighborhood_created_idx
  on public.notification_campaigns (neighborhood_id, created_at desc);

alter table public.notification_campaigns enable row level security;

create or replace function public.admin_notification_audience_counts()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_admin public.profiles%rowtype; v_result jsonb;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid() and role = 'admin' and coalesce(account_status, 'active') <> 'suspended' limit 1;
  if v_admin.id is null then raise exception 'Acceso administrativo requerido.' using errcode = '42501'; end if;
  if v_admin.neighborhood_id is null then raise exception 'El administrador no tiene un barrio asignado.' using errcode = '22023'; end if;

  select jsonb_build_object(
    'all', count(*) filter (where true),
    'verified', count(*) filter (where p.verification_status = 'verified' or coalesce(p.verified, false) or p.verified_at is not null),
    'actors', count(*) filter (where coalesce(p.can_publish_events, false)),
    'commerces', count(*) filter (where p.user_type in ('business', 'commerce', 'comercio') or exists (select 1 from public.commerces c where c.owner_id = p.id))
  ) into v_result
  from public.profiles p
  where p.neighborhood_id = v_admin.neighborhood_id and coalesce(p.account_status, 'active') <> 'suspended';
  return v_result;
end;
$$;

create or replace function public.admin_send_broadcast_notification(p_audience text, p_title text, p_body text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_admin public.profiles%rowtype; v_campaign_id uuid; v_count integer := 0;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid() and role = 'admin' and coalesce(account_status, 'active') <> 'suspended' limit 1;
  if v_admin.id is null then raise exception 'Acceso administrativo requerido.' using errcode = '42501'; end if;
  if v_admin.neighborhood_id is null then raise exception 'El administrador no tiene un barrio asignado.' using errcode = '22023'; end if;
  if p_audience not in ('all', 'verified', 'commerces', 'actors') then raise exception 'Audiencia no válida.' using errcode = '22023'; end if;
  if length(trim(coalesce(p_title, ''))) not between 3 and 90 then raise exception 'El título debe tener entre 3 y 90 caracteres.' using errcode = '22023'; end if;
  if length(trim(coalesce(p_body, ''))) not between 3 and 300 then raise exception 'El mensaje debe tener entre 3 y 300 caracteres.' using errcode = '22023'; end if;

  insert into public.notification_campaigns (admin_profile_id, neighborhood_id, audience, title, body)
  values (v_admin.id, v_admin.neighborhood_id, p_audience, trim(p_title), trim(p_body)) returning id into v_campaign_id;

  insert into public.notifications (user_id, from_user_id, type, title, body, read, related_id)
  select p.id, v_admin.id, 'system', trim(p_title), trim(p_body), false, v_campaign_id
  from public.profiles p
  where p.neighborhood_id = v_admin.neighborhood_id
    and coalesce(p.account_status, 'active') <> 'suspended'
    and (
      p_audience = 'all'
      or (p_audience = 'verified' and (p.verification_status = 'verified' or coalesce(p.verified, false) or p.verified_at is not null))
      or (p_audience = 'actors' and coalesce(p.can_publish_events, false))
      or (p_audience = 'commerces' and (p.user_type in ('business', 'commerce', 'comercio') or exists (select 1 from public.commerces c where c.owner_id = p.id)))
    );
  get diagnostics v_count = row_count;
  update public.notification_campaigns set recipient_count = v_count where id = v_campaign_id;
  return jsonb_build_object('campaign_id', v_campaign_id, 'recipient_count', v_count);
end;
$$;

create or replace function public.admin_list_notification_campaigns()
returns table (id uuid, audience text, title text, body text, recipient_count integer, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid() and role = 'admin' and coalesce(account_status, 'active') <> 'suspended' limit 1;
  if v_admin.id is null then raise exception 'Acceso administrativo requerido.' using errcode = '42501'; end if;
  return query select c.id, c.audience, c.title, c.body, c.recipient_count, c.created_at
  from public.notification_campaigns c where c.neighborhood_id = v_admin.neighborhood_id order by c.created_at desc limit 100;
end;
$$;

revoke all on function public.admin_notification_audience_counts() from public;
revoke all on function public.admin_send_broadcast_notification(text, text, text) from public;
revoke all on function public.admin_list_notification_campaigns() from public;
grant execute on function public.admin_notification_audience_counts() to authenticated;
grant execute on function public.admin_send_broadcast_notification(text, text, text) to authenticated;
grant execute on function public.admin_list_notification_campaigns() to authenticated;
