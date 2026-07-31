create or replace function public.admin_send_notification(
  p_target_profile_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid;
  v_notification_id uuid;
begin
  select id into v_admin_profile_id
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;

  if v_admin_profile_id is null then
    raise exception 'Solo un administrador activo puede enviar notificaciones.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_target_profile_id) then
    raise exception 'El perfil destinatario no existe.' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_title, ''))) > 90 then
    raise exception 'El título debe tener entre 3 y 90 caracteres.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_body, ''))) < 3 or length(trim(coalesce(p_body, ''))) > 300 then
    raise exception 'El mensaje debe tener entre 3 y 300 caracteres.' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, from_user_id, type, title, body, read)
  values (p_target_profile_id, v_admin_profile_id, 'system', trim(p_title), trim(p_body), false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.admin_send_notification(uuid, text, text) from public;
grant execute on function public.admin_send_notification(uuid, text, text) to authenticated;
