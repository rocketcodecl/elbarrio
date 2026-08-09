-- Núcleo competitivo: confianza, preferencias, actores oficiales, impacto y seguimiento.

alter table public.profiles add column if not exists is_official_actor boolean not null default false;
alter table public.profiles add column if not exists official_actor_type text;
alter table public.profiles add column if not exists official_actor_name text;
alter table public.profiles add column if not exists completed_interactions_count integer not null default 0;
alter table public.profiles drop constraint if exists profiles_official_actor_type_check;
alter table public.profiles add constraint profiles_official_actor_type_check check (
  official_actor_type is null or official_actor_type in ('junta_vecinos','municipalidad','seguridad','bomberos','salud','colegio','organizacion')
);

alter table public.posts add column if not exists event_recurrence text not null default 'none';
alter table public.posts add column if not exists recurrence_until timestamptz;
alter table public.posts drop constraint if exists posts_event_recurrence_check;
alter table public.posts add constraint posts_event_recurrence_check check (event_recurrence in ('none','weekly','biweekly','monthly'));

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),
  check(blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy user_blocks_own_all on public.user_blocks for all to authenticated
  using(blocker_id=(select id from public.profiles where user_id=auth.uid()))
  with check(blocker_id=(select id from public.profiles where user_id=auth.uid()));

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  content_type text not null check(content_type in ('post','incident','comment','commerce_review','service_review','profile')),
  content_id uuid not null,
  reason text not null check(reason in ('spam','fraude','acoso','ilegal','informacion_falsa','privacidad','otro')),
  details text,
  status text not null default 'pending' check(status in ('pending','reviewed','actioned','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  unique(reporter_id,content_type,content_id)
);
alter table public.content_reports enable row level security;
create policy content_reports_own_read on public.content_reports for select to authenticated
  using(reporter_id=(select id from public.profiles where user_id=auth.uid()));
create policy content_reports_own_insert on public.content_reports for insert to authenticated
  with check(reporter_id=(select id from public.profiles where user_id=auth.uid()));

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  urgent_alerts boolean not null default true,
  messages_and_deals boolean not null default true,
  event_reminders boolean not null default true,
  community_digest boolean not null default true,
  marketplace boolean not null default false,
  commerce_promotions boolean not null default false,
  general_push boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy notification_preferences_own_all on public.notification_preferences for all to authenticated
  using(profile_id=(select id from public.profiles where user_id=auth.uid()))
  with check(profile_id=(select id from public.profiles where user_id=auth.uid()));

create table if not exists public.event_follows (
  event_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(event_id,profile_id)
);
alter table public.event_follows enable row level security;
create policy event_follows_own_all on public.event_follows for all to authenticated
  using(profile_id=(select id from public.profiles where user_id=auth.uid()))
  with check(profile_id=(select id from public.profiles where user_id=auth.uid()));
create policy event_follows_count_read on public.event_follows for select to authenticated using(true);

create table if not exists public.deal_reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.marketplace_deals(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(deal_id,reviewer_id),
  check(reviewer_id<>reviewed_id)
);
alter table public.deal_reviews enable row level security;
create policy deal_reviews_neighborhood_read on public.deal_reviews for select to authenticated using(
  exists(select 1 from public.profiles me join public.profiles target on target.id=deal_reviews.reviewed_id where me.user_id=auth.uid() and me.neighborhood_id=target.neighborhood_id)
);

create or replace function public.submit_deal_review(p_deal_id uuid,p_rating integer,p_comment text default null)
returns public.deal_reviews language plpgsql security definer set search_path=public as $$
declare me public.profiles%rowtype; deal public.marketplace_deals%rowtype; target uuid; result public.deal_reviews%rowtype;
begin
  select * into me from public.profiles where user_id=auth.uid() and coalesce(account_status,'active')='active' limit 1;
  if p_rating not between 1 and 5 then raise exception 'La calificación debe estar entre 1 y 5' using errcode='22023'; end if;
  select * into deal from public.marketplace_deals where id=p_deal_id and status='completed';
  if me.id is null or deal.id is null or me.id not in(deal.buyer_id,deal.seller_id) then raise exception 'Solo participantes de un trato completado pueden evaluarlo' using errcode='42501'; end if;
  target:=case when me.id=deal.buyer_id then deal.seller_id else deal.buyer_id end;
  insert into public.deal_reviews(deal_id,reviewer_id,reviewed_id,rating,comment) values(deal.id,me.id,target,p_rating,nullif(trim(p_comment),''))
  on conflict(deal_id,reviewer_id) do update set rating=excluded.rating,comment=excluded.comment returning * into result;
  update public.profiles p set reputation_score=(select round(avg(rating)::numeric,1) from public.deal_reviews where reviewed_id=target),completed_interactions_count=(select count(*) from public.marketplace_deals where status='completed' and target in(buyer_id,seller_id)) where p.id=target;
  return result;
end $$;
grant execute on function public.submit_deal_review(uuid,integer,text) to authenticated;

create or replace function public.submit_content_report(p_content_type text,p_content_id uuid,p_reason text,p_details text default null)
returns public.content_reports language plpgsql security definer set search_path=public as $$
declare me public.profiles%rowtype; result public.content_reports%rowtype;
begin
  select * into me from public.profiles where user_id=auth.uid() and coalesce(account_status,'active')='active' limit 1;
  if me.id is null then raise exception 'Sesión vecinal requerida' using errcode='42501'; end if;
  if p_content_type not in ('post','incident','comment','commerce_review','service_review','profile') then raise exception 'Tipo de contenido no válido' using errcode='22023'; end if;
  if p_reason not in ('spam','fraude','acoso','ilegal','informacion_falsa','privacidad','otro') then raise exception 'Motivo no válido' using errcode='22023'; end if;
  insert into public.content_reports(reporter_id,neighborhood_id,content_type,content_id,reason,details)
  values(me.id,me.neighborhood_id,p_content_type,p_content_id,p_reason,nullif(trim(p_details),''))
  on conflict(reporter_id,content_type,content_id) do update set reason=excluded.reason,details=excluded.details,status='pending',created_at=now() returning * into result;
  return result;
end $$;
grant execute on function public.submit_content_report(text,uuid,text,text) to authenticated;

create or replace function public.admin_list_content_reports()
returns table(id uuid,content_type text,content_id uuid,reason text,details text,status text,created_at timestamptz,reporter_name text,neighborhood_id uuid)
language sql security definer set search_path=public as $$
  select r.id,r.content_type,r.content_id,r.reason,r.details,r.status,r.created_at,p.full_name,r.neighborhood_id from public.content_reports r join public.profiles p on p.id=r.reporter_id
  where exists(select 1 from public.profiles a where a.user_id=auth.uid() and a.role='admin' and coalesce(a.account_status,'active')='active' and (a.is_superadmin or a.neighborhood_id=r.neighborhood_id)) order by r.created_at desc;
$$;
grant execute on function public.admin_list_content_reports() to authenticated;

create or replace function public.admin_resolve_content_report(p_report_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare admin public.profiles%rowtype; report public.content_reports%rowtype;
begin
 select * into admin from public.profiles where user_id=auth.uid() and role='admin' and coalesce(account_status,'active')='active'; select * into report from public.content_reports where id=p_report_id;
 if admin.id is null or report.id is null or (not admin.is_superadmin and admin.neighborhood_id is distinct from report.neighborhood_id) then raise exception 'Acceso administrativo requerido' using errcode='42501'; end if;
 if p_status not in ('reviewed','actioned','dismissed') then raise exception 'Estado de revisión no válido' using errcode='22023'; end if;
 update public.content_reports set status=p_status,admin_note=nullif(trim(p_note),''),reviewed_by=admin.id,reviewed_at=now() where id=p_report_id;
end $$;
grant execute on function public.admin_resolve_content_report(uuid,text,text) to authenticated;

create or replace function public.admin_set_official_actor(p_profile_id uuid,p_enabled boolean,p_type text default null,p_name text default null,p_reason text default null)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare admin public.profiles%rowtype; before_row public.profiles%rowtype; result public.profiles%rowtype;
begin
 select * into admin from public.profiles where user_id=auth.uid() and role='admin' and is_superadmin=true and coalesce(account_status,'active')='active';
 if admin.id is null then raise exception 'Acción permitida solo para el superadministrador' using errcode='42501'; end if;
 if p_enabled and p_type not in ('junta_vecinos','municipalidad','seguridad','bomberos','salud','colegio','organizacion') then raise exception 'Tipo de actor oficial no válido' using errcode='22023'; end if;
 select * into before_row from public.profiles where id=p_profile_id; if before_row.id is null then raise exception 'Perfil no encontrado'; end if;
 update public.profiles set is_official_actor=p_enabled,official_actor_type=case when p_enabled then p_type else null end,official_actor_name=case when p_enabled then nullif(trim(p_name),'') else null end where id=p_profile_id returning * into result;
 insert into public.user_admin_actions(admin_profile_id,target_profile_id,action,previous_role,new_role,details)
 values(admin.id,p_profile_id,'edit_profile',before_row.role,before_row.role,jsonb_build_object('reason',p_reason,'official_actor',p_enabled,'type',p_type,'name',p_name));
 return result;
end $$;
grant execute on function public.admin_set_official_actor(uuid,boolean,text,text,text) to authenticated;

create or replace function public.get_neighborhood_impact()
returns jsonb language plpgsql security definer set search_path=public as $$
declare me public.profiles%rowtype;
begin
 select * into me from public.profiles where user_id=auth.uid(); if me.id is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 return jsonb_build_object(
  'neighbors', (select count(*) from public.profiles where neighborhood_id=me.neighborhood_id and verification_status='verified' and coalesce(account_status,'active')='active'),
  'completed_deals',(select count(*) from public.marketplace_deals d join public.posts p on p.id=d.post_id where d.status='completed' and p.neighborhood_id=me.neighborhood_id),
  'gifts',(select count(*) from public.posts where neighborhood_id=me.neighborhood_id and type='gift' and status in('sold','closed')),
  'resolved_help',(select count(*) from public.posts where neighborhood_id=me.neighborhood_id and type='request' and status in('closed','resolved')),
  'resolved_alerts',(select count(*) from public.incident_reports where neighborhood_id=me.neighborhood_id and status='resuelto'),
  'active_commerces',(select count(*) from public.commerces where neighborhood_id=me.neighborhood_id and is_active=true)
 );
end $$;
grant execute on function public.get_neighborhood_impact() to authenticated;

create index if not exists content_reports_status_created_idx on public.content_reports(status,created_at desc);
create index if not exists event_follows_event_idx on public.event_follows(event_id);
