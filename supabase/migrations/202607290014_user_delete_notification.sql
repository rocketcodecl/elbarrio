create or replace function public.user_delete_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications n
  using public.profiles p
  where n.id = p_notification_id
    and n.user_id = p.id
    and p.user_id = auth.uid();

  if not found then
    raise exception 'La notificación no existe o no pertenece al usuario.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.user_delete_notification(uuid) from public;
grant execute on function public.user_delete_notification(uuid) to authenticated;
