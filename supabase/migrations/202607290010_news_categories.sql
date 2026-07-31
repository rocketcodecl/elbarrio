-- Categorías administrables para Noticias.

create table if not exists public.news_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  icon text not null default '📰',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_categories_key_format check (key ~ '^[a-z0-9_-]+$'),
  constraint news_categories_name_not_blank check (length(trim(name)) > 0)
);

alter table public.news_categories enable row level security;

drop policy if exists "news categories are public" on public.news_categories;
create policy "news categories are public"
  on public.news_categories for select using (true);

drop policy if exists "admins manage news categories" on public.news_categories;
create policy "admins manage news categories"
  on public.news_categories for all
  using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

insert into public.news_categories (key, name, icon, sort_order)
values
  ('general', 'General', '📰', 10),
  ('asamblea', 'Asamblea', '🗳️', 20),
  ('obras', 'Obras', '🚧', 30),
  ('servicios', 'Servicios', '💧', 40),
  ('seguridad', 'Seguridad', '🚨', 50)
on conflict (key) do nothing;
