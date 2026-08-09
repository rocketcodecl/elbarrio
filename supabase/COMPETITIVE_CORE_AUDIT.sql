-- Auditoría de solo lectura del núcleo competitivo aplicado el 9 de agosto de 2026.
select 'tabla' as tipo, name as objeto,
  case when to_regclass('public.' || name) is not null then 'OK' else 'FALTA' end as estado
from unnest(array['user_blocks','content_reports','notification_preferences','event_follows','deal_reviews']) as name
union all
select 'función', signature,
  case when to_regprocedure('public.' || signature) is not null then 'OK' else 'FALTA' end
from unnest(array[
  'submit_deal_review(uuid,integer,text)',
  'submit_content_report(text,uuid,text,text)',
  'admin_list_content_reports()',
  'admin_resolve_content_report(uuid,text,text)',
  'admin_set_official_actor(uuid,boolean,text,text,text)',
  'get_neighborhood_impact()',
  'deliver_my_due_event_reminders()',
  'admin_set_notification_category(uuid,text)'
]) as signature
union all
select 'columna', item,
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name=split_part(item,'.',1) and column_name=split_part(item,'.',2)
  ) then 'OK' else 'FALTA' end
from unnest(array[
  'profiles.is_official_actor','profiles.official_actor_type','profiles.official_actor_name',
  'profiles.completed_interactions_count','posts.event_recurrence','posts.recurrence_until',
  'event_follows.reminder_sent_at','notification_campaigns.preference_key'
]) as item
order by tipo, objeto;
