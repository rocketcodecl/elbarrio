-- Eliminación administrativa segura de cuentas.
-- No borra perfiles ni contenido comunitario: invalida Auth, anonimiza datos
-- personales y conserva una auditoría técnica del superadministrador responsable.

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'deleted'));

alter table public.account_deletion_events
  add column if not exists requested_by_profile_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'self';

alter table public.account_deletion_events
  drop constraint if exists account_deletion_events_source_check;

alter table public.account_deletion_events
  add constraint account_deletion_events_source_check
  check (source in ('self', 'superadmin'));

comment on column public.account_deletion_events.requested_by_profile_id is
  'Superadministrador que solicitó la eliminación; nulo en autoeliminación.';

comment on column public.account_deletion_events.source is
  'Origen de la eliminación: solicitud del propio usuario o superadministración.';
