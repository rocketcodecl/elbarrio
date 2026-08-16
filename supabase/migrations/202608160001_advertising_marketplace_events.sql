-- Amplía el inventario publicitario a Mercado y Eventos.
-- Ejecutar manualmente después de 202608120003_advertising_section_placements.sql.

alter table public.advertising_campaigns
  drop constraint if exists advertising_campaigns_placements_check;
alter table public.advertising_campaigns
  add constraint advertising_campaigns_placements_check
  check (
    cardinality(placements) > 0
    and placements <@ array[
      'home_feature', 'activity_feed', 'services_feed', 'commerces_feed',
      'marketplace_feed', 'events_feed'
    ]::text[]
  );

alter table public.advertising_events
  drop constraint if exists advertising_events_placement_check;
alter table public.advertising_events
  add constraint advertising_events_placement_check
  check (placement in (
    'home_feature', 'activity_feed', 'services_feed', 'commerces_feed',
    'marketplace_feed', 'events_feed'
  ));

drop function if exists public.get_active_advertising_campaign(text);
create function public.get_active_advertising_campaign(p_placement text)
returns table (
  id uuid,
  advertiser_name text,
  title text,
  body text,
  image_url text,
  image_urls text[],
  label text,
  cta_label text,
  cta_url text
)
language sql
security definer
set search_path = public
as $$
  with viewer as (
    select p.id as profile_id, p.neighborhood_id
    from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.account_status, 'active') = 'active'
    limit 1
  )
  select
    c.id, c.advertiser_name, c.title, c.body, c.image_url,
    c.image_urls, c.label, c.cta_label, c.cta_url
  from viewer v
  join public.advertising_campaign_neighborhoods target
    on target.neighborhood_id = v.neighborhood_id
  join public.advertising_campaigns c on c.id = target.campaign_id
  where p_placement in (
      'home_feature', 'activity_feed', 'services_feed', 'commerces_feed',
      'marketplace_feed', 'events_feed'
    )
    and p_placement = any(c.placements)
    and c.status = 'active'
    and c.starts_at <= now()
    and (c.ends_at is null or c.ends_at > now())
  order by c.priority desc, random()
  limit 1;
$$;

create or replace function public.record_advertising_event(
  p_campaign_id uuid,
  p_placement text,
  p_event_type text,
  p_event_key uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_placement not in (
      'home_feature', 'activity_feed', 'services_feed', 'commerces_feed',
      'marketplace_feed', 'events_feed'
    ) or p_event_type not in ('impression', 'click') then
    raise exception 'Evento publicitario inválido';
  end if;

  select * into v_profile
  from public.profiles
  where user_id = auth.uid()
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_profile.id is null or v_profile.neighborhood_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.advertising_campaigns c
    join public.advertising_campaign_neighborhoods target
      on target.campaign_id = c.id
    where c.id = p_campaign_id
      and target.neighborhood_id = v_profile.neighborhood_id
      and p_placement = any(c.placements)
  ) then
    return false;
  end if;

  insert into public.advertising_events (
    campaign_id, profile_id, neighborhood_id, placement, event_type, event_key
  ) values (
    p_campaign_id, v_profile.id, v_profile.neighborhood_id,
    p_placement, p_event_type, p_event_key
  )
  on conflict (campaign_id, event_type, event_key) do nothing;

  return true;
end;
$$;

create or replace function public.admin_upsert_advertising_campaign_v2(
  p_campaign_id uuid,
  p_advertiser_name text,
  p_campaign_name text,
  p_title text,
  p_body text,
  p_image_url text,
  p_image_urls text[],
  p_label text,
  p_cta_label text,
  p_cta_url text,
  p_placements text[],
  p_neighborhood_ids uuid[],
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text,
  p_priority integer,
  p_contracted_amount numeric,
  p_payment_status text,
  p_internal_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  if coalesce(cardinality(p_placements), 0) = 0
     or not (p_placements <@ array[
       'home_feature', 'activity_feed', 'services_feed', 'commerces_feed',
       'marketplace_feed', 'events_feed'
     ]::text[]) then
    raise exception 'Ubicación publicitaria inválida';
  end if;

  -- El RPC original conserva las validaciones de seguridad, fechas,
  -- imágenes y barrios. Después se aplican las seis ubicaciones vigentes.
  v_campaign_id := public.admin_upsert_advertising_campaign(
    p_campaign_id => p_campaign_id,
    p_advertiser_name => p_advertiser_name,
    p_campaign_name => p_campaign_name,
    p_title => p_title,
    p_body => p_body,
    p_image_url => p_image_url,
    p_image_urls => p_image_urls,
    p_label => p_label,
    p_cta_label => p_cta_label,
    p_cta_url => p_cta_url,
    p_placements => array['home_feature']::text[],
    p_neighborhood_ids => p_neighborhood_ids,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_status => p_status,
    p_priority => p_priority,
    p_contracted_amount => p_contracted_amount,
    p_payment_status => p_payment_status,
    p_internal_notes => p_internal_notes
  );

  update public.advertising_campaigns
  set placements = p_placements, updated_at = now()
  where id = v_campaign_id;

  return v_campaign_id;
end;
$$;

revoke all on function public.get_active_advertising_campaign(text) from public, anon;
revoke all on function public.record_advertising_event(uuid, text, text, uuid) from public, anon;
revoke all on function public.admin_upsert_advertising_campaign_v2(uuid, text, text, text, text, text, text[], text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) from public, anon;
grant execute on function public.get_active_advertising_campaign(text) to authenticated;
grant execute on function public.record_advertising_event(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_upsert_advertising_campaign_v2(uuid, text, text, text, text, text, text[], text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) to authenticated;

comment on function public.admin_upsert_advertising_campaign_v2(uuid, text, text, text, text, text, text[], text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text)
  is 'Crea o actualiza campañas para Inicio, Actividad, Servicios, Comercios, Mercado y Eventos.';
