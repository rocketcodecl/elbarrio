-- Publicidad nativa, programada y segmentada por barrio.
-- Ejecutar manualmente en Supabase SQL Editor y confirmar el resultado.

create table if not exists public.advertising_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text not null,
  campaign_name text not null,
  title text not null,
  body text not null,
  image_url text not null,
  label text not null default 'Patrocinado',
  cta_label text not null default 'Conocer más',
  cta_url text not null,
  placements text[] not null default array['home_feature']::text[],
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'draft',
  priority integer not null default 100,
  contracted_amount numeric(12,2),
  payment_status text not null default 'pending',
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertising_campaigns_status_check
    check (status in ('draft', 'active', 'paused', 'finished')),
  constraint advertising_campaigns_payment_check
    check (payment_status in ('pending', 'paid', 'courtesy', 'cancelled')),
  constraint advertising_campaigns_placements_check
    check (
      cardinality(placements) > 0
      and placements <@ array['home_feature', 'activity_feed']::text[]
    ),
  constraint advertising_campaigns_dates_check
    check (ends_at is null or ends_at > starts_at),
  constraint advertising_campaigns_priority_check
    check (priority between 0 and 1000),
  constraint advertising_campaigns_cta_url_check
    check (cta_url ~* '^https?://')
);

create table if not exists public.advertising_campaign_neighborhoods (
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, neighborhood_id)
);

create table if not exists public.advertising_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  placement text not null,
  event_type text not null,
  event_key uuid not null,
  created_at timestamptz not null default now(),
  constraint advertising_events_placement_check
    check (placement in ('home_feature', 'activity_feed')),
  constraint advertising_events_type_check
    check (event_type in ('impression', 'click')),
  unique (campaign_id, event_type, event_key)
);

create index if not exists advertising_campaigns_active_idx
  on public.advertising_campaigns (status, starts_at, ends_at, priority desc);
create index if not exists advertising_campaign_neighborhood_idx
  on public.advertising_campaign_neighborhoods (neighborhood_id, campaign_id);
create index if not exists advertising_events_campaign_idx
  on public.advertising_events (campaign_id, created_at desc);

alter table public.advertising_campaigns enable row level security;
alter table public.advertising_campaign_neighborhoods enable row level security;
alter table public.advertising_events enable row level security;

drop policy if exists "superadmins manage advertising campaigns" on public.advertising_campaigns;
create policy "superadmins manage advertising campaigns"
on public.advertising_campaigns for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "superadmins manage advertising targets" on public.advertising_campaign_neighborhoods;
create policy "superadmins manage advertising targets"
on public.advertising_campaign_neighborhoods for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
);

drop policy if exists "superadmins read advertising events" on public.advertising_events;
create policy "superadmins read advertising events"
on public.advertising_events for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
);

-- La app nunca consulta directamente las tablas: recibe solo una campaña
-- vigente para el barrio del usuario y la ubicación solicitada.
create or replace function public.get_active_advertising_campaign(p_placement text)
returns table (
  id uuid,
  advertiser_name text,
  title text,
  body text,
  image_url text,
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
    c.label, c.cta_label, c.cta_url
  from viewer v
  join public.advertising_campaign_neighborhoods target
    on target.neighborhood_id = v.neighborhood_id
  join public.advertising_campaigns c on c.id = target.campaign_id
  where p_placement in ('home_feature', 'activity_feed')
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
  if p_placement not in ('home_feature', 'activity_feed')
     or p_event_type not in ('impression', 'click') then
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

create or replace function public.admin_upsert_advertising_campaign(
  p_campaign_id uuid,
  p_advertiser_name text,
  p_campaign_name text,
  p_title text,
  p_body text,
  p_image_url text,
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
  v_admin_id uuid;
  v_campaign_id uuid;
begin
  select p.id into v_admin_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_superadmin = true
    and coalesce(p.account_status, 'active') = 'active'
  limit 1;

  if v_admin_id is null then raise exception 'Acceso denegado'; end if;
  if nullif(trim(p_advertiser_name), '') is null
     or nullif(trim(p_campaign_name), '') is null
     or nullif(trim(p_title), '') is null
     or nullif(trim(p_body), '') is null
     or nullif(trim(p_image_url), '') is null
     or nullif(trim(p_cta_url), '') is null then
    raise exception 'Completa los campos obligatorios';
  end if;
  if p_cta_url !~* '^https?://' then raise exception 'El enlace debe comenzar con http:// o https://'; end if;
  if coalesce(cardinality(p_neighborhood_ids), 0) = 0 then raise exception 'Selecciona al menos un barrio'; end if;
  if coalesce(cardinality(p_placements), 0) = 0
     or not (p_placements <@ array['home_feature', 'activity_feed']::text[]) then
    raise exception 'Ubicación publicitaria inválida';
  end if;

  if p_campaign_id is null then
    insert into public.advertising_campaigns (
      advertiser_name, campaign_name, title, body, image_url, label,
      cta_label, cta_url, placements, starts_at, ends_at, status, priority,
      contracted_amount, payment_status, internal_notes, created_by, updated_by
    ) values (
      trim(p_advertiser_name), trim(p_campaign_name), trim(p_title), trim(p_body),
      trim(p_image_url), coalesce(nullif(trim(p_label), ''), 'Patrocinado'),
      coalesce(nullif(trim(p_cta_label), ''), 'Conocer más'), trim(p_cta_url),
      p_placements, p_starts_at, p_ends_at, p_status, p_priority,
      p_contracted_amount, p_payment_status, nullif(trim(p_internal_notes), ''),
      v_admin_id, v_admin_id
    ) returning id into v_campaign_id;
  else
    update public.advertising_campaigns set
      advertiser_name = trim(p_advertiser_name), campaign_name = trim(p_campaign_name),
      title = trim(p_title), body = trim(p_body), image_url = trim(p_image_url),
      label = coalesce(nullif(trim(p_label), ''), 'Patrocinado'),
      cta_label = coalesce(nullif(trim(p_cta_label), ''), 'Conocer más'),
      cta_url = trim(p_cta_url), placements = p_placements,
      starts_at = p_starts_at, ends_at = p_ends_at, status = p_status,
      priority = p_priority, contracted_amount = p_contracted_amount,
      payment_status = p_payment_status, internal_notes = nullif(trim(p_internal_notes), ''),
      updated_by = v_admin_id, updated_at = now()
    where id = p_campaign_id
    returning id into v_campaign_id;
    if v_campaign_id is null then raise exception 'Campaña no encontrada'; end if;
  end if;

  delete from public.advertising_campaign_neighborhoods
  where campaign_id = v_campaign_id;
  insert into public.advertising_campaign_neighborhoods (campaign_id, neighborhood_id)
  select v_campaign_id, neighborhood_id
  from unnest(p_neighborhood_ids) neighborhood_id;

  return v_campaign_id;
end;
$$;

create or replace function public.admin_advertising_campaign_metrics()
returns table (
  campaign_id uuid,
  impressions bigint,
  clicks bigint,
  unique_neighbors bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    count(e.id) filter (where e.event_type = 'impression') as impressions,
    count(e.id) filter (where e.event_type = 'click') as clicks,
    count(distinct e.profile_id) as unique_neighbors
  from public.advertising_campaigns c
  left join public.advertising_events e on e.campaign_id = c.id
  where exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.is_superadmin = true
      and coalesce(p.account_status, 'active') = 'active'
  )
  group by c.id;
$$;

revoke all on function public.get_active_advertising_campaign(text) from public, anon;
revoke all on function public.record_advertising_event(uuid, text, text, uuid) from public, anon;
revoke all on function public.admin_upsert_advertising_campaign(uuid, text, text, text, text, text, text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) from public, anon;
revoke all on function public.admin_advertising_campaign_metrics() from public, anon;
grant execute on function public.get_active_advertising_campaign(text) to authenticated;
grant execute on function public.record_advertising_event(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_upsert_advertising_campaign(uuid, text, text, text, text, text, text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) to authenticated;
grant execute on function public.admin_advertising_campaign_metrics() to authenticated;

grant select, insert, update on public.advertising_campaigns to authenticated;
grant select, insert, update, delete on public.advertising_campaign_neighborhoods to authenticated;
grant select on public.advertising_events to authenticated;

comment on table public.advertising_campaigns is 'Campañas publicitarias nativas administradas por El Barrio.';
comment on table public.advertising_events is 'Impresiones y clics deduplicados por campaña y render.';
