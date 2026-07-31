-- Registro de decisiones de moderación preventiva para contenido público.
-- Esta migración se prepara para ejecución manual en Supabase SQL Editor.
-- No reemplaza las políticas RLS de las tablas de contenido.

create table if not exists public.content_moderation_events (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  content_kind text not null,
  decision text not null check (decision in ('allow', 'review', 'block')),
  categories text[] not null default '{}',
  reason text,
  content_excerpt text,
  content_hash text not null,
  model text not null,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists content_moderation_events_neighborhood_created_idx
  on public.content_moderation_events (neighborhood_id, created_at desc);

create index if not exists content_moderation_events_decision_created_idx
  on public.content_moderation_events (decision, created_at desc);

alter table public.content_moderation_events enable row level security;

drop policy if exists "admins read moderation events in scope"
  on public.content_moderation_events;
create policy "admins read moderation events in scope"
  on public.content_moderation_events
  for select
  to authenticated
  using (
    public.current_profile_is_superadmin()
    or public.current_admin_can_manage_neighborhood(neighborhood_id)
  );

revoke all on table public.content_moderation_events from anon;
revoke insert, update, delete on table public.content_moderation_events from authenticated;
grant select on table public.content_moderation_events to authenticated;

comment on table public.content_moderation_events is
  'Auditoría de decisiones preventivas de IA sobre contenido público; escritura exclusiva del backend.';
