-- Edición global y trazable para el superadministrador.

alter table public.user_admin_actions add column if not exists details jsonb;
alter table public.user_admin_actions drop constraint if exists user_admin_actions_action_check;
alter table public.user_admin_actions add constraint user_admin_actions_action_check
  check (action in ('verify','approve_actor','revoke_actor','assign_admin','remove_admin','assign_superadmin','remove_superadmin','suspend','reactivate','edit_profile'));

alter table public.post_admin_actions add column if not exists details jsonb;
alter table public.post_admin_actions drop constraint if exists post_admin_actions_action_check;
alter table public.post_admin_actions add constraint post_admin_actions_action_check
  check (action in ('hide','restore','close','remove','edit','create'));

create or replace function public.admin_update_profile_details(
  p_target_profile_id uuid,
  p_changes jsonb,
  p_reason text default 'Actualización administrativa'
)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_allowed jsonb;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid() and role = 'admin' and is_superadmin = true
    and coalesce(account_status,'active') = 'active' limit 1;
  if v_admin.id is null then raise exception 'Acción permitida solo para el superadministrador' using errcode='42501'; end if;
  select * into v_before from public.profiles where id=p_target_profile_id for update;
  if not found then raise exception 'Usuario no encontrado' using errcode='P0002'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Debes registrar un motivo' using errcode='22023'; end if;

  v_allowed := p_changes - array['id','user_id','role','is_superadmin','account_status','verified','verified_at','verification_status','can_publish_events','suspended_at','suspended_by','created_at','invite_code'];
  if nullif(trim(v_allowed->>'full_name'),'') is null and v_allowed ? 'full_name' then raise exception 'El nombre no puede quedar vacío' using errcode='22023'; end if;
  if v_allowed ? 'email' and nullif(trim(v_allowed->>'email'),'') is not null
    and exists(select 1 from public.profiles where lower(email)=lower(trim(v_allowed->>'email')) and id<>p_target_profile_id)
  then raise exception 'Ese correo ya pertenece a otro perfil' using errcode='23505'; end if;
  if v_allowed ? 'rut' and nullif(trim(v_allowed->>'rut'),'') is not null
    and exists(select 1 from public.profiles where rut=trim(v_allowed->>'rut') and id<>p_target_profile_id)
  then raise exception 'Ese RUT ya pertenece a otro perfil' using errcode='23505'; end if;

  update public.profiles set
    full_name = case when v_allowed ? 'full_name' then trim(v_allowed->>'full_name') else full_name end,
    email = case when v_allowed ? 'email' then nullif(lower(trim(v_allowed->>'email')),'') else email end,
    phone = case when v_allowed ? 'phone' then nullif(trim(v_allowed->>'phone'),'') else phone end,
    rut = case when v_allowed ? 'rut' then nullif(trim(v_allowed->>'rut'),'') else rut end,
    address = case when v_allowed ? 'address' then nullif(trim(v_allowed->>'address'),'') else address end,
    comuna = case when v_allowed ? 'comuna' then nullif(trim(v_allowed->>'comuna'),'') else comuna end,
    bio = case when v_allowed ? 'bio' then nullif(trim(v_allowed->>'bio'),'') else bio end,
    user_type = case when v_allowed ? 'user_type' then nullif(trim(v_allowed->>'user_type'),'') else user_type end,
    avatar_url = case when v_allowed ? 'avatar_url' then nullif(trim(v_allowed->>'avatar_url'),'') else avatar_url end,
    neighborhood_id = case when v_allowed ? 'neighborhood_id' then nullif(v_allowed->>'neighborhood_id','')::uuid else neighborhood_id end,
    badge_founder = case when v_allowed ? 'badge_founder' then (v_allowed->>'badge_founder')::boolean else badge_founder end,
    badge_collaborator = case when v_allowed ? 'badge_collaborator' then (v_allowed->>'badge_collaborator')::boolean else badge_collaborator end,
    badge_trusted_seller = case when v_allowed ? 'badge_trusted_seller' then (v_allowed->>'badge_trusted_seller')::boolean else badge_trusted_seller end,
    badge_connector = case when v_allowed ? 'badge_connector' then (v_allowed->>'badge_connector')::boolean else badge_connector end
  where id=p_target_profile_id returning * into v_after;

  insert into public.user_admin_actions(target_profile_id,admin_profile_id,action,previous_role,new_role,previous_account_status,new_account_status,previous_verification_status,new_verification_status,previous_can_publish_events,new_can_publish_events,details)
  values(p_target_profile_id,v_admin.id,'edit_profile',v_before.role,v_after.role,v_before.account_status,v_after.account_status,v_before.verification_status,v_after.verification_status,v_before.can_publish_events,v_after.can_publish_events,jsonb_build_object('reason',trim(p_reason),'changes',v_allowed));
  return v_after;
end $$;

revoke all on function public.admin_update_profile_details(uuid,jsonb,text) from public;
grant execute on function public.admin_update_profile_details(uuid,jsonb,text) to authenticated;

create or replace function public.admin_edit_post(p_post_id uuid,p_changes jsonb,p_reason text)
returns public.posts language plpgsql security definer set search_path=public as $$
declare v_admin uuid; v_before public.posts%rowtype; v_after public.posts%rowtype; v_allowed jsonb;
begin
  select id into v_admin from public.profiles where user_id=auth.uid() and role='admin' and is_superadmin=true and coalesce(account_status,'active')='active' limit 1;
  if v_admin is null then raise exception 'Acción permitida solo para el superadministrador' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Debes registrar un motivo' using errcode='22023'; end if;
  select * into v_before from public.posts where id=p_post_id for update;
  if not found then raise exception 'Publicación no encontrada' using errcode='P0002'; end if;
  v_allowed := p_changes - array['id','author_id','neighborhood_id','type','created_at','likes_count','comments_count','views_count','featured_by','home_carousel_order'];
  if v_allowed ? 'title' and nullif(trim(v_allowed->>'title'),'') is null then raise exception 'El título no puede quedar vacío' using errcode='22023'; end if;
  update public.posts set
    title=case when v_allowed?'title' then trim(v_allowed->>'title') else title end,
    content=case when v_allowed?'content' then nullif(trim(v_allowed->>'content'),'') else content end,
    category=case when v_allowed?'category' then nullif(trim(v_allowed->>'category'),'') else category end,
    price=case when v_allowed?'price' then nullif(v_allowed->>'price','')::numeric else price end,
    budget=case when v_allowed?'budget' then nullif(v_allowed->>'budget','')::numeric else budget end,
    looking_for=case when v_allowed?'looking_for' then nullif(trim(v_allowed->>'looking_for'),'') else looking_for end,
    is_negotiable=case when v_allowed?'is_negotiable' then (v_allowed->>'is_negotiable')::boolean else is_negotiable end,
    status=case when v_allowed?'status' then trim(v_allowed->>'status') else status end,
    show_in_activity=case when v_allowed?'show_in_activity' then (v_allowed->>'show_in_activity')::boolean else show_in_activity end,
    news_source=case when v_allowed?'news_source' then nullif(trim(v_allowed->>'news_source'),'') else news_source end,
    news_url=case when v_allowed?'news_url' then nullif(trim(v_allowed->>'news_url'),'') else news_url end,
    news_is_official=case when v_allowed?'news_is_official' then (v_allowed->>'news_is_official')::boolean else news_is_official end,
    service_phone=case when v_allowed?'service_phone' then nullif(trim(v_allowed->>'service_phone'),'') else service_phone end,
    service_whatsapp=case when v_allowed?'service_whatsapp' then nullif(trim(v_allowed->>'service_whatsapp'),'') else service_whatsapp end,
    service_instagram=case when v_allowed?'service_instagram' then nullif(trim(v_allowed->>'service_instagram'),'') else service_instagram end,
    location_text=case when v_allowed?'location_text' then nullif(trim(v_allowed->>'location_text'),'') else location_text end
  where id=p_post_id returning * into v_after;
  insert into public.post_admin_actions(post_id,admin_profile_id,action,reason,previous_status,new_status,details)
  values(p_post_id,v_admin,'edit',trim(p_reason),v_before.status,v_after.status,v_allowed);
  return v_after;
end $$;

revoke all on function public.admin_edit_post(uuid,jsonb,text) from public;
grant execute on function public.admin_edit_post(uuid,jsonb,text) to authenticated;
