-- Crear y editar alertas desde el panel global con auditoría.
alter table public.incident_admin_actions drop constraint if exists incident_admin_actions_action_check;
alter table public.incident_admin_actions add constraint incident_admin_actions_action_check check(action in ('approve','reject','mark_official','unmark_official','resolve','create','edit'));
alter table public.incident_admin_actions add column if not exists details jsonb;

create or replace function public.admin_save_incident(p_incident_id uuid,p_data jsonb,p_reason text default 'Gestión desde panel')
returns public.incident_reports language plpgsql security definer set search_path=public as $$
declare v_admin public.profiles%rowtype; v_before public.incident_reports%rowtype; v_after public.incident_reports%rowtype; v_id uuid;
begin
  select * into v_admin from public.profiles where user_id=auth.uid() and role='admin' and is_superadmin=true and coalesce(account_status,'active')='active' limit 1;
  if v_admin.id is null then raise exception 'Acción permitida solo para el superadministrador' using errcode='42501'; end if;
  if length(trim(coalesce(p_data->>'title','')))<3 or length(trim(coalesce(p_data->>'description','')))<3 then raise exception 'Título y descripción son obligatorios' using errcode='22023'; end if;
  if nullif(p_data->>'neighborhood_id','') is null then raise exception 'Selecciona un barrio' using errcode='22023'; end if;
  if p_incident_id is null then
    insert into public.incident_reports(reporter_id,neighborhood_id,title,description,category,severity,location_text,latitude,longitude,images,status,is_official,is_anonymous,confirms_count,flags_count,expires_at)
    values(v_admin.id,(p_data->>'neighborhood_id')::uuid,trim(p_data->>'title'),trim(p_data->>'description'),coalesce(nullif(trim(p_data->>'category'),''),'otro'),coalesce(nullif(trim(p_data->>'severity'),''),'media'),nullif(trim(p_data->>'location_text'),''),nullif(p_data->>'latitude','')::double precision,nullif(p_data->>'longitude','')::double precision,case when jsonb_typeof(p_data->'images')='array' then p_data->'images' else null end,coalesce(nullif(p_data->>'status',''),'active'),coalesce((p_data->>'is_official')::boolean,true),false,0,0,nullif(p_data->>'expires_at','')::timestamp)
    returning * into v_after; v_id:=v_after.id;
    insert into public.incident_admin_actions(incident_id,admin_profile_id,action,previous_status,new_status,previous_is_official,new_is_official,details) values(v_id,v_admin.id,'create',null,v_after.status,false,v_after.is_official,p_data);
  else
    select * into v_before from public.incident_reports where id=p_incident_id for update; if not found then raise exception 'Alerta no encontrada' using errcode='P0002'; end if;
    update public.incident_reports set title=trim(p_data->>'title'),description=trim(p_data->>'description'),category=coalesce(nullif(trim(p_data->>'category'),''),category),severity=coalesce(nullif(trim(p_data->>'severity'),''),severity),location_text=case when p_data?'location_text' then nullif(trim(p_data->>'location_text'),'') else location_text end,latitude=case when p_data?'latitude' then nullif(p_data->>'latitude','')::double precision else latitude end,longitude=case when p_data?'longitude' then nullif(p_data->>'longitude','')::double precision else longitude end,images=case when jsonb_typeof(p_data->'images')='array' then p_data->'images' else images end,status=coalesce(nullif(p_data->>'status',''),status),is_official=case when p_data?'is_official' then (p_data->>'is_official')::boolean else is_official end,expires_at=case when p_data?'expires_at' then nullif(p_data->>'expires_at','')::timestamp else expires_at end where id=p_incident_id returning * into v_after;
    insert into public.incident_admin_actions(incident_id,admin_profile_id,action,previous_status,new_status,previous_is_official,new_is_official,details) values(p_incident_id,v_admin.id,'edit',v_before.status,v_after.status,v_before.is_official,v_after.is_official,jsonb_build_object('reason',p_reason,'changes',p_data));
  end if;
  return v_after;
end $$;
revoke all on function public.admin_save_incident(uuid,jsonb,text) from public; grant execute on function public.admin_save_incident(uuid,jsonb,text) to authenticated;
