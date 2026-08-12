-- Radar comercial privado: descubrimiento y seguimiento de negocios por barrio.

create table if not exists public.commercial_prospects (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  source text not null default 'openstreetmap',
  source_id text not null,
  name text not null,
  category text,
  source_type text,
  address text,
  phone text,
  website text,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'new',
  notes text,
  contact_name text,
  last_contact_at timestamptz,
  converted_commerce_id uuid references public.commerces(id) on delete set null,
  raw_data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (neighborhood_id, source, source_id),
  constraint commercial_prospects_status_check check (
    status in ('new', 'contacted', 'interested', 'converted', 'discarded')
  ),
  constraint commercial_prospects_lat_check check (latitude between -90 and 90),
  constraint commercial_prospects_lng_check check (longitude between -180 and 180)
);

create index if not exists commercial_prospects_neighborhood_status_idx
  on public.commercial_prospects (neighborhood_id, status, updated_at desc);
create index if not exists commercial_prospects_name_idx
  on public.commercial_prospects (neighborhood_id, lower(name));

alter table public.commercial_prospects enable row level security;

drop policy if exists commercial_prospects_admin_select on public.commercial_prospects;
create policy commercial_prospects_admin_select
  on public.commercial_prospects for select to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = commercial_prospects.neighborhood_id)
    )
  );

drop policy if exists commercial_prospects_admin_insert on public.commercial_prospects;
create policy commercial_prospects_admin_insert
  on public.commercial_prospects for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = commercial_prospects.neighborhood_id)
    )
  );

drop policy if exists commercial_prospects_admin_update on public.commercial_prospects;
create policy commercial_prospects_admin_update
  on public.commercial_prospects for update to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = commercial_prospects.neighborhood_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = commercial_prospects.neighborhood_id)
    )
  );

drop policy if exists commercial_prospects_admin_delete on public.commercial_prospects;
create policy commercial_prospects_admin_delete
  on public.commercial_prospects for delete to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.account_status, 'active') = 'active'
        and (coalesce(admin.is_superadmin, false) or admin.neighborhood_id = commercial_prospects.neighborhood_id)
    )
  );

grant select, insert, update, delete on public.commercial_prospects to authenticated;

comment on table public.commercial_prospects is
  'Prospectos comerciales descubiertos dentro del polígono de un barrio; solo visibles para administradores autorizados.';
