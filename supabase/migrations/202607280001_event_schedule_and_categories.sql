-- Eventos: rango horario y categorías administrables desde el panel web.

alter table public.posts
  add column if not exists ends_at timestamptz;

alter table public.posts
  drop constraint if exists posts_event_schedule_check;

alter table public.posts
  add constraint posts_event_schedule_check
  check (ends_at is null or starts_at is null or ends_at > starts_at);

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  icon text not null default '📌',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_categories_key_format check (key ~ '^[a-z0-9_-]+$'),
  constraint event_categories_name_not_blank check (length(trim(name)) > 0)
);

alter table public.event_categories enable row level security;

drop policy if exists "event categories are public" on public.event_categories;
create policy "event categories are public"
  on public.event_categories for select
  using (true);

drop policy if exists "admins manage event categories" on public.event_categories;
create policy "admins manage event categories"
  on public.event_categories for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

insert into public.event_categories (key, name, icon, sort_order)
values
  ('asambleas', 'Asamblea', '🏛️', 10),
  ('ferias', 'Feria', '🥬', 20),
  ('talleres', 'Taller', '🎨', 30),
  ('deportes', 'Deporte', '⚽', 40),
  ('otros', 'Otro', '📌', 50)
on conflict (key) do nothing;
