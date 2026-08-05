-- Impide que una sesión autenticada eleve sus propios privilegios mediante
-- un UPDATE directo a profiles. Las operaciones administrativas legítimas
-- continúan pasando por funciones SECURITY DEFINER o por service_role.

create or replace function public.prevent_direct_profile_privilege_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated'
    and (
      new.user_id is distinct from old.user_id
      or new.role is distinct from old.role
      or new.is_superadmin is distinct from old.is_superadmin
      or new.can_publish_events is distinct from old.can_publish_events
      or new.account_status is distinct from old.account_status
      or new.suspended_at is distinct from old.suspended_at
      or new.suspended_by is distinct from old.suspended_by
    )
  then
    raise exception 'Los permisos y el estado de la cuenta solo pueden modificarse desde una acción administrativa.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_from_direct_updates
  on public.profiles;
create trigger protect_profile_privileges_from_direct_updates
before update on public.profiles
for each row execute function public.prevent_direct_profile_privilege_changes();

revoke all on function public.prevent_direct_profile_privilege_changes() from public;

comment on function public.prevent_direct_profile_privilege_changes() is
  'Bloquea escalación directa de role/is_superadmin y cambios directos de permisos o suspensión desde sesiones autenticadas.';
