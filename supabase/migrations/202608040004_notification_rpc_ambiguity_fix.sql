-- Corrige la referencia ambigua `id` de la RPC suprema de campañas.
-- Ejecutar manualmente en SQL Editor. No usar `supabase db push`.

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
    or not exists (
      select 1
      from public.neighborhoods neighborhood
      where neighborhood.id = p_neighborhood_id
    ) then
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

revoke all on function public.admin_super_list_notification_campaigns(uuid) from public;
grant execute on function public.admin_super_list_notification_campaigns(uuid) to authenticated;

