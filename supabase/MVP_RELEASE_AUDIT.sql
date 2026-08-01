-- Auditoría de solo lectura para el cierre del MVP de El Barrio.
-- No crea, modifica ni elimina datos. Ejecutar completa en Supabase SQL Editor.
-- Todo resultado debe quedar en estado OK antes del cierre.

with required_tables(name) as (
  values
    ('profiles'), ('neighborhoods'), ('posts'), ('comments'), ('messages'),
    ('incident_reports'), ('incident_admin_actions'), ('commerces'), ('commerce_products'),
    ('commerce_reviews'), ('commerce_favorites'), ('service_reviews'),
    ('farmacias'), ('notifications'), ('marketplace_deals'),
    ('neighbor_invites'), ('neighborhood_waitlist'), ('app_content_pages'),
    ('content_moderation_events'), ('notification_campaigns'),
    ('event_categories'), ('news_categories'), ('user_admin_actions')
),
required_functions(name) as (
  values
    ('barrio_en_punto_mvp'), ('marketplace_propose_deal'),
    ('marketplace_respond_deal'), ('get_my_neighbor_invites'),
    ('accept_neighbor_invite'), ('join_neighborhood_waitlist'),
    ('admin_list_neighborhood_waitlist'), ('admin_manage_profile'),
    ('admin_moderate_incident'), ('admin_get_user_activity'),
    ('admin_send_notification'), ('admin_set_home_event_spotlight'),
    ('admin_update_app_content'), ('admin_list_neighbor_invite_metrics')
),
required_columns(table_name, column_name) as (
  values
    ('profiles', 'is_superadmin'), ('profiles', 'invite_code'),
    ('profiles', 'badge_connector'), ('profiles', 'verification_status'),
    ('profiles', 'account_status'), ('profiles', 'neighborhood_id'),
    ('profiles', 'address_lat'), ('profiles', 'address_lng'),
    ('posts', 'show_in_activity'), ('posts', 'show_on_home'),
    ('posts', 'is_featured'), ('posts', 'starts_at'),
    ('posts', 'ends_at'), ('posts', 'event_ticket_prices'),
    ('posts', 'service_phone'), ('posts', 'service_whatsapp'),
    ('farmacias', 'is_active'), ('farmacias', 'is_on_duty')
),
checks as (
  select 'tabla'::text as tipo, name as objeto,
    (to_regclass('public.' || name) is not null) as ok
  from required_tables

  union all

  select 'función', name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = required_functions.name
    )
  from required_functions

  union all

  select 'columna', table_name || '.' || column_name,
    exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = required_columns.table_name
        and c.column_name = required_columns.column_name
    )
  from required_columns

  union all

  select 'RLS', c.relname,
    c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'profiles', 'posts', 'messages', 'incident_reports', 'marketplace_deals',
      'neighbor_invites', 'neighborhood_waitlist', 'app_content_pages',
      'content_moderation_events', 'notification_campaigns'
    )
)
select tipo, objeto, case when ok then 'OK' else 'FALTA' end as estado
from checks
order by ok, tipo, objeto;
