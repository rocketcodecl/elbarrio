-- Contraste controlado de Radar comercial con Google Places.
-- Solo persiste el identificador estable permitido y la auditoría de consumo;
-- los datos descriptivos de Google se consultan y muestran en vivo.

alter table public.commercial_prospects
  add column if not exists google_place_id text,
  add column if not exists google_linked_at timestamptz,
  add column if not exists google_linked_by uuid references public.profiles(id) on delete set null;

create unique index if not exists commercial_prospects_google_place_idx
  on public.commercial_prospects (neighborhood_id, google_place_id)
  where google_place_id is not null;

create table if not exists public.commercial_google_usage (
  id bigint generated always as identity primary key,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  request_kind text not null,
  search_term text,
  requested_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint commercial_google_usage_kind_check check (request_kind in ('area_search', 'prospect_match', 'place_details'))
);

create index if not exists commercial_google_usage_day_idx
  on public.commercial_google_usage (requested_on, requested_by);

alter table public.commercial_google_usage enable row level security;

drop policy if exists commercial_google_usage_superadmin_select on public.commercial_google_usage;
create policy commercial_google_usage_superadmin_select
  on public.commercial_google_usage for select to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.user_id = auth.uid()
        and lower(coalesce(admin.role, '')) = 'admin'
        and coalesce(admin.is_superadmin, false)
        and coalesce(admin.account_status, 'active') = 'active'
    )
  );

grant select on public.commercial_google_usage to authenticated;

comment on column public.commercial_prospects.google_place_id is
  'Identificador de Google Places enlazado por un superadministrador; no almacena contenido descriptivo de Google.';
comment on table public.commercial_google_usage is
  'Auditoría privada de solicitudes realizadas por el Radar a Google Places para controlar consumo.';
