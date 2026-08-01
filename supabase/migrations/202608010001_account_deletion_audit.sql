-- Auditoría mínima de eliminación de cuentas.
-- La identidad se guarda como hash; nunca se conserva el correo ni el RUT.

create table if not exists public.account_deletion_events (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  profile_id uuid,
  status text not null default 'started'
    check (status in ('started', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  delete_after timestamptz not null default (now() + interval '90 days')
);

create index if not exists account_deletion_events_delete_after_idx
  on public.account_deletion_events (delete_after);

alter table public.account_deletion_events enable row level security;

revoke all on table public.account_deletion_events from anon, authenticated;

comment on table public.account_deletion_events is
  'Registro técnico temporal y no identificatorio de eliminaciones de cuenta.';

