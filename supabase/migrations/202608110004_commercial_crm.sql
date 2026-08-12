-- CRM comercial territorial: edición, seguimiento, verificación e historial.

alter table public.commercial_prospects
  add column if not exists email text,
  add column if not exists whatsapp text,
  add column if not exists social_url text,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null;

alter table public.commercial_prospects
  drop constraint if exists commercial_prospects_status_check;

alter table public.commercial_prospects
  add constraint commercial_prospects_status_check check (
    status in (
      'new',
      'to_contact',
      'contacted',
      'visit_scheduled',
      'interested',
      'proposal_sent',
      'converted',
      'discarded'
    )
  );

create index if not exists commercial_prospects_follow_up_idx
  on public.commercial_prospects (neighborhood_id, next_follow_up_at)
  where next_follow_up_at is not null;

create index if not exists commercial_prospects_verified_idx
  on public.commercial_prospects (neighborhood_id, verified_at desc)
  where verified_at is not null;

create table if not exists public.commercial_prospect_interactions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.commercial_prospects(id) on delete cascade,
  admin_profile_id uuid not null references public.profiles(id) on delete restrict,
  interaction_type text not null default 'note',
  summary text not null,
  scheduled_for timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint commercial_prospect_interaction_type_check check (
    interaction_type in ('note', 'call', 'whatsapp', 'email', 'visit', 'status', 'verification', 'publication')
  )
);

create index if not exists commercial_prospect_interactions_prospect_idx
  on public.commercial_prospect_interactions (prospect_id, created_at desc);

alter table public.commercial_prospect_interactions enable row level security;

drop policy if exists commercial_prospect_interactions_admin_select on public.commercial_prospect_interactions;
create policy commercial_prospect_interactions_admin_select
  on public.commercial_prospect_interactions for select to authenticated
  using (
    exists (
      select 1
      from public.profiles admin
      join public.commercial_prospects prospect on prospect.id = commercial_prospect_interactions.prospect_id
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = prospect.neighborhood_id)
    )
  );

drop policy if exists commercial_prospect_interactions_admin_insert on public.commercial_prospect_interactions;
create policy commercial_prospect_interactions_admin_insert
  on public.commercial_prospect_interactions for insert to authenticated
  with check (
    admin_profile_id in (
      select admin.id
      from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
    )
    and exists (
      select 1
      from public.profiles admin
      join public.commercial_prospects prospect on prospect.id = commercial_prospect_interactions.prospect_id
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = prospect.neighborhood_id)
    )
  );

grant select, insert on public.commercial_prospect_interactions to authenticated;

comment on table public.commercial_prospect_interactions is
  'Cronología privada de contactos, visitas, tareas, verificaciones y publicaciones del CRM comercial territorial.';
