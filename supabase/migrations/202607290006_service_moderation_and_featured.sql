-- Moderación y visibilidad patrocinada para publicaciones de servicios.

alter table public.posts
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_starts_at timestamptz,
  add column if not exists featured_until timestamptz,
  add column if not exists featured_by uuid references public.profiles(id) on delete set null;

create index if not exists posts_service_moderation_idx
  on public.posts (neighborhood_id, status, created_at desc)
  where type = 'service';

create index if not exists posts_service_featured_idx
  on public.posts (neighborhood_id, featured_starts_at, featured_until)
  where type = 'service' and is_featured = true;

comment on column public.posts.is_featured is 'Indica que el servicio tiene visibilidad comercial patrocinada.';
comment on column public.posts.featured_starts_at is 'Inicio de la vigencia del patrocinio.';
comment on column public.posts.featured_until is 'Término de la vigencia del patrocinio.';
comment on column public.posts.featured_by is 'Perfil administrador que programó el patrocinio.';
