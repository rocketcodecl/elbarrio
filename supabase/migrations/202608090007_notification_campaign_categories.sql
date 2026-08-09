-- Categoriza campañas para respetar las preferencias push del vecino.

alter table public.notification_campaigns add column if not exists preference_key text not null default 'general_push';
alter table public.notification_campaigns drop constraint if exists notification_campaigns_preference_key_check;
alter table public.notification_campaigns add constraint notification_campaigns_preference_key_check
  check(preference_key in ('general_push','urgent_alerts','event_reminders','community_digest','marketplace','commerce_promotions'));

create or replace function public.admin_set_notification_category(p_campaign_id uuid,p_preference_key text)
returns void language plpgsql security definer set search_path=public as $$
declare admin public.profiles%rowtype; campaign public.notification_campaigns%rowtype;
begin
  select * into admin from public.profiles where user_id=auth.uid() and role='admin' and coalesce(account_status,'active')='active' limit 1;
  select * into campaign from public.notification_campaigns where id=p_campaign_id;
  if admin.id is null or campaign.id is null or campaign.admin_profile_id<>admin.id
    or (not admin.is_superadmin and campaign.neighborhood_id is distinct from admin.neighborhood_id)
  then raise exception 'Campaña no autorizada' using errcode='42501'; end if;
  if p_preference_key not in ('general_push','urgent_alerts','event_reminders','community_digest','marketplace','commerce_promotions')
  then raise exception 'Categoría no válida' using errcode='22023'; end if;
  update public.notification_campaigns set preference_key=p_preference_key where id=p_campaign_id;
end $$;
revoke all on function public.admin_set_notification_category(uuid,text) from public;
grant execute on function public.admin_set_notification_category(uuid,text) to authenticated;
