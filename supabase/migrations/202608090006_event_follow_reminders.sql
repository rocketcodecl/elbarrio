-- Recordatorios internos, deduplicados y respetando la preferencia del vecino.

alter table public.event_follows add column if not exists reminder_sent_at timestamptz;

create or replace function public.deliver_my_due_event_reminders()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  me public.profiles%rowtype;
  delivered integer := 0;
begin
  select * into me from public.profiles
  where user_id=auth.uid() and coalesce(account_status,'active')='active' limit 1;
  if me.id is null then return 0; end if;

  with due as (
    select f.event_id,p.title,p.starts_at
    from public.event_follows f
    join public.posts p on p.id=f.event_id
    left join public.notification_preferences pref on pref.profile_id=f.profile_id
    where f.profile_id=me.id and f.reminder_enabled=true and f.reminder_sent_at is null
      and coalesce(pref.event_reminders,true)=true
      and p.status='active' and p.type='event'
      and p.starts_at between now() and now()+interval '24 hours'
  ), inserted as (
    insert into public.notifications(user_id,type,title,body,post_id,read)
    select me.id,'event_reminder','Tu evento es pronto',
      '“'||left(coalesce(due.title,'Evento del barrio'),90)||'” comienza dentro de las próximas 24 horas.',
      due.event_id,false
    from due
    returning post_id
  )
  update public.event_follows f set reminder_sent_at=now()
  where f.profile_id=me.id and f.event_id in(select post_id from inserted);

  get diagnostics delivered=row_count;
  return delivered;
end $$;

revoke all on function public.deliver_my_due_event_reminders() from public;
grant execute on function public.deliver_my_due_event_reminders() to authenticated;
