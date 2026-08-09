-- Moderación trazable de comentarios y reseñas.
create table if not exists public.content_admin_actions(
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.profiles(id),
  content_type text not null check(content_type in ('comment','commerce_review','service_review')),
  content_id uuid not null,
  action text not null check(action='remove'),
  reason text not null check(length(trim(reason))>=3),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.content_admin_actions enable row level security;
drop policy if exists content_admin_actions_superadmin_read on public.content_admin_actions;
create policy content_admin_actions_superadmin_read on public.content_admin_actions for select to authenticated using(exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin' and p.is_superadmin=true));
grant select on public.content_admin_actions to authenticated;

create or replace function public.admin_list_user_content()
returns table(content_type text,content_id uuid,parent_title text,author_name text,content text,rating integer,created_at timestamptz)
language sql security definer set search_path=public as $$
  select 'comment',c.id,p.title,coalesce(a.full_name,'Sin autor'),c.content,null::integer,c.created_at::timestamptz
  from public.comments c left join public.posts p on p.id=c.post_id left join public.profiles a on a.id=c.author_id
  where exists(select 1 from public.profiles x where x.user_id=auth.uid() and x.role='admin' and x.is_superadmin=true)
  union all
  select 'commerce_review',r.id,coalesce(co.name,'Comercio'),coalesce(a.full_name,r.reviewer_name,'Sin autor'),r.comment,r.rating::integer,r.created_at
  from public.commerce_reviews r left join public.commerces co on co.id=r.commerce_id left join public.profiles a on a.id=coalesce(r.reviewer_id,r.author_id)
  where exists(select 1 from public.profiles x where x.user_id=auth.uid() and x.role='admin' and x.is_superadmin=true)
  union all
  select 'service_review',r.id,coalesce(s.title,'Servicio'),coalesce(a.full_name,'Sin autor'),r.comment,r.rating::integer,r.created_at
  from public.service_reviews r left join public.posts s on s.id=r.service_id left join public.profiles a on a.id=r.reviewer_id
  where exists(select 1 from public.profiles x where x.user_id=auth.uid() and x.role='admin' and x.is_superadmin=true)
  order by created_at desc limit 1000
$$;
revoke all on function public.admin_list_user_content() from public; grant execute on function public.admin_list_user_content() to authenticated;

create or replace function public.admin_remove_user_content(p_content_type text,p_content_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_admin uuid; v_snapshot jsonb;
begin
  select id into v_admin from public.profiles where user_id=auth.uid() and role='admin' and is_superadmin=true and coalesce(account_status,'active')='active';
  if v_admin is null then raise exception 'Acción permitida solo para el superadministrador' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Debes registrar un motivo' using errcode='22023'; end if;
  if p_content_type='comment' then select to_jsonb(c) into v_snapshot from public.comments c where id=p_content_id; delete from public.comments where id=p_content_id;
  elsif p_content_type='commerce_review' then select to_jsonb(r) into v_snapshot from public.commerce_reviews r where id=p_content_id; delete from public.commerce_reviews where id=p_content_id;
  elsif p_content_type='service_review' then select to_jsonb(r) into v_snapshot from public.service_reviews r where id=p_content_id; delete from public.service_reviews where id=p_content_id;
  else raise exception 'Tipo de contenido no válido' using errcode='22023'; end if;
  if v_snapshot is null then raise exception 'Contenido no encontrado' using errcode='P0002'; end if;
  insert into public.content_admin_actions(admin_profile_id,content_type,content_id,action,reason,snapshot) values(v_admin,p_content_type,p_content_id,'remove',trim(p_reason),v_snapshot);
  return true;
end $$;
revoke all on function public.admin_remove_user_content(text,uuid,text) from public; grant execute on function public.admin_remove_user_content(text,uuid,text) to authenticated;
