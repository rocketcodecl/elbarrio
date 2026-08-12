-- Hasta tres imágenes por campaña publicitaria.
-- Ejecutar manualmente después de 202608120001_advertising_campaigns.sql.

alter table public.advertising_campaigns
  add column if not exists image_urls text[];

update public.advertising_campaigns
set image_urls = array[image_url]
where image_urls is null or cardinality(image_urls) = 0;

alter table public.advertising_campaigns
  alter column image_urls set default array[]::text[],
  alter column image_urls set not null;

alter table public.advertising_campaigns
  drop constraint if exists advertising_campaigns_image_urls_check;
alter table public.advertising_campaigns
  add constraint advertising_campaigns_image_urls_check
  check (cardinality(image_urls) between 1 and 3);

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
  where p_placement in ('home_feature', 'activity_feed')
    and p_placement = any(c.placements)
    and c.status = 'active'
    and c.starts_at <= now()
    and (c.ends_at is null or c.ends_at > now())
  order by c.priority desc, random()
  limit 1;
$$;

create or replace function public.admin_upsert_advertising_campaign(
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
  v_admin_id uuid;
  v_campaign_id uuid;
  v_images text[];
begin
  select p.id into v_admin_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_superadmin = true
    and coalesce(p.account_status, 'active') = 'active'
  limit 1;

  if v_admin_id is null then raise exception 'Acceso denegado'; end if;
  v_images := array(
    select trim(value)
    from unnest(coalesce(p_image_urls, array[]::text[])) value
    where nullif(trim(value), '') is not null
    limit 3
  );
  if cardinality(v_images) = 0 and nullif(trim(p_image_url), '') is not null then
    v_images := array[trim(p_image_url)];
  end if;
  if nullif(trim(p_advertiser_name), '') is null
     or nullif(trim(p_campaign_name), '') is null
     or nullif(trim(p_title), '') is null
     or nullif(trim(p_body), '') is null
     or cardinality(v_images) = 0
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
      advertiser_name, campaign_name, title, body, image_url, image_urls, label,
      cta_label, cta_url, placements, starts_at, ends_at, status, priority,
      contracted_amount, payment_status, internal_notes, created_by, updated_by
    ) values (
      trim(p_advertiser_name), trim(p_campaign_name), trim(p_title), trim(p_body),
      v_images[1], v_images, coalesce(nullif(trim(p_label), ''), 'Patrocinado'),
      coalesce(nullif(trim(p_cta_label), ''), 'Conocer más'), trim(p_cta_url),
      p_placements, p_starts_at, p_ends_at, p_status, p_priority,
      p_contracted_amount, p_payment_status, nullif(trim(p_internal_notes), ''),
      v_admin_id, v_admin_id
    ) returning id into v_campaign_id;
  else
    update public.advertising_campaigns set
      advertiser_name = trim(p_advertiser_name), campaign_name = trim(p_campaign_name),
      title = trim(p_title), body = trim(p_body), image_url = v_images[1], image_urls = v_images,
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

  delete from public.advertising_campaign_neighborhoods where campaign_id = v_campaign_id;
  insert into public.advertising_campaign_neighborhoods (campaign_id, neighborhood_id)
  select v_campaign_id, neighborhood_id from unnest(p_neighborhood_ids) neighborhood_id;
  return v_campaign_id;
end;
$$;

-- Mantiene funcionando el panel publicado durante el breve intervalo entre
-- ejecutar esta migración y desplegar el editor de tres imágenes.
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
language sql
security definer
set search_path = public
as $$
  select public.admin_upsert_advertising_campaign(
    p_campaign_id => p_campaign_id,
    p_advertiser_name => p_advertiser_name,
    p_campaign_name => p_campaign_name,
    p_title => p_title,
    p_body => p_body,
    p_image_url => p_image_url,
    p_image_urls => array[p_image_url],
    p_label => p_label,
    p_cta_label => p_cta_label,
    p_cta_url => p_cta_url,
    p_placements => p_placements,
    p_neighborhood_ids => p_neighborhood_ids,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_status => p_status,
    p_priority => p_priority,
    p_contracted_amount => p_contracted_amount,
    p_payment_status => p_payment_status,
    p_internal_notes => p_internal_notes
  );
$$;

revoke all on function public.get_active_advertising_campaign(text) from public, anon;
revoke all on function public.admin_upsert_advertising_campaign(uuid, text, text, text, text, text, text[], text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) from public, anon;
grant execute on function public.get_active_advertising_campaign(text) to authenticated;
grant execute on function public.admin_upsert_advertising_campaign(uuid, text, text, text, text, text, text[], text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) to authenticated;
grant execute on function public.admin_upsert_advertising_campaign(uuid, text, text, text, text, text, text, text, text, text[], uuid[], timestamptz, timestamptz, text, integer, numeric, text, text) to authenticated;

comment on column public.advertising_campaigns.image_urls is 'Una a tres imágenes ordenadas para el carrusel publicitario.';
