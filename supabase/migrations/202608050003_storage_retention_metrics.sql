-- Control de costos del MVP: cola recuperable de archivos, retención básica
-- y métricas administrativas. Ejecutar manualmente en SQL Editor; no usar db push.

create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('posts', 'avatars', 'commerces')),
  object_path text not null,
  source_table text,
  source_id text,
  reason text not null default 'reference_removed',
  delete_after timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create unique index if not exists storage_cleanup_queue_pending_object_idx
  on public.storage_cleanup_queue(bucket, object_path)
  where processed_at is null;

alter table public.storage_cleanup_queue enable row level security;
revoke all on public.storage_cleanup_queue from anon, authenticated;

create table if not exists public.service_usage_events (
  id bigint generated always as identity primary key,
  service text not null check (service in ('openrouter', 'firebase', 'resend', 'supabase')),
  operation text not null,
  success boolean not null default true,
  quantity integer not null default 1,
  cost_usd numeric(14, 8),
  input_tokens integer,
  output_tokens integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_usage_events_service_created_idx
  on public.service_usage_events(service, created_at desc);

alter table public.service_usage_events enable row level security;
revoke all on public.service_usage_events from anon, authenticated;

create or replace function public.enqueue_storage_url(
  candidate_url text,
  origin_table text,
  origin_id text,
  cleanup_reason text default 'reference_removed'
) returns void
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  marker constant text := '/storage/v1/object/public/';
  tail text;
  parsed_bucket text;
  parsed_path text;
begin
  if candidate_url is null or position(marker in candidate_url) = 0 then return; end if;
  tail := split_part(candidate_url, marker, 2);
  parsed_bucket := split_part(tail, '/', 1);
  parsed_path := substring(tail from length(parsed_bucket) + 2);
  parsed_path := split_part(parsed_path, '?', 1);
  if parsed_bucket not in ('posts', 'avatars', 'commerces') or parsed_path = '' then return; end if;

  insert into public.storage_cleanup_queue(bucket, object_path, source_table, source_id, reason)
  select parsed_bucket, parsed_path, origin_table, origin_id, cleanup_reason
  where not exists (
    select 1 from public.storage_cleanup_queue q
    where q.bucket = parsed_bucket and q.object_path = parsed_path and q.processed_at is null
  );
end;
$$;

revoke all on function public.enqueue_storage_url(text, text, text, text) from public, anon, authenticated;

create or replace function public.queue_removed_storage_assets()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  value jsonb;
  asset_url text;
  new_record_text text := case when tg_op = 'UPDATE' then to_jsonb(new)::text else '' end;
  record_id text := coalesce(to_jsonb(old)->>'id', 'unknown');
begin
  for value in select jsonb_path_query(to_jsonb(old), '$.** ? (@.type() == "string")') loop
    asset_url := value #>> '{}';
    if position('/storage/v1/object/public/' in asset_url) > 0
       and (tg_op = 'DELETE' or position(asset_url in new_record_text) = 0) then
      perform public.enqueue_storage_url(asset_url, tg_table_name, record_id,
        case when tg_op = 'DELETE' then 'record_deleted' else 'reference_replaced' end);
    end if;
  end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'posts', 'incident_reports', 'commerces', 'commerce_products', 'profiles', 'app_content_pages'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop trigger if exists queue_removed_storage_assets on public.%I', table_name);
      execute format(
        'create trigger queue_removed_storage_assets after update or delete on public.%I for each row execute function public.queue_removed_storage_assets()',
        table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.apply_basic_content_retention()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare expired_alerts integer := 0;
begin
  update public.incident_reports
     set status = 'resuelto',
         resolved_at = coalesce(resolved_at, now())
   where status = 'active'
     and expires_at is not null
     and expires_at <= now();
  get diagnostics expired_alerts = row_count;
  return jsonb_build_object('expired_alerts_archived', expired_alerts, 'ran_at', now());
end;
$$;

revoke all on function public.apply_basic_content_retention() from public, anon, authenticated;
grant execute on function public.apply_basic_content_retention() to service_role;

create or replace function public.admin_get_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  caller public.profiles%rowtype;
  storage_by_bucket jsonb := '{}'::jsonb;
  usage_by_service jsonb := '{}'::jsonb;
  pending_cleanup integer := 0;
  failed_cleanup integer := 0;
  active_devices integer := 0;
  campaigns_30d integer := 0;
begin
  select * into caller from public.profiles where user_id = auth.uid();
  if caller.id is null or caller.role <> 'admin' or not coalesce(caller.is_superadmin, false)
     or caller.account_status = 'suspended' then
    raise exception 'Acceso de superadministrador requerido' using errcode = '42501';
  end if;

  select coalesce(jsonb_object_agg(bucket_id, details), '{}'::jsonb)
    into storage_by_bucket
  from (
    select bucket_id,
      jsonb_build_object(
        'files', count(*),
        'bytes', coalesce(sum(case when coalesce(metadata->>'size', '') ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end), 0)
      ) details
    from storage.objects
    where bucket_id in ('posts', 'avatars', 'commerces')
    group by bucket_id
  ) grouped;

  select count(*) filter (where processed_at is null),
         count(*) filter (where processed_at is null and last_error is not null)
    into pending_cleanup, failed_cleanup
  from public.storage_cleanup_queue;

  if to_regclass('public.push_device_tokens') is not null then
    execute 'select count(*) from public.push_device_tokens where is_active = true' into active_devices;
  end if;
  if to_regclass('public.notification_campaigns') is not null then
    execute 'select count(*) from public.notification_campaigns where created_at >= now() - interval ''30 days''' into campaigns_30d;
  end if;

  select coalesce(jsonb_object_agg(service, details), '{}'::jsonb)
    into usage_by_service
  from (
    select service, jsonb_build_object(
      'events_30d', count(*),
      'failures_30d', count(*) filter (where not success),
      'quantity_30d', coalesce(sum(quantity), 0),
      'cost_usd_30d', coalesce(sum(cost_usd), 0)
    ) details
    from public.service_usage_events
    where created_at >= now() - interval '30 days'
    group by service
  ) grouped;

  return jsonb_build_object(
    'storage', storage_by_bucket,
    'usage', usage_by_service,
    'cleanup', jsonb_build_object('pending', pending_cleanup, 'failed', failed_cleanup, 'grace_days', 7),
    'firebase', jsonb_build_object('active_devices', active_devices, 'campaigns_30d', campaigns_30d),
    'retention', jsonb_build_object('alerts', 'expiry_by_category', 'closed_days', 90, 'orphan_grace_days', 7),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.admin_get_platform_metrics() from public, anon;
grant execute on function public.admin_get_platform_metrics() to authenticated;
