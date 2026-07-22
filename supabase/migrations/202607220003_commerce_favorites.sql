-- Favoritos de comercios.
-- La relación vecino-comercio es privada; solo el contador agregado es público.

create table if not exists public.commerce_favorites (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (commerce_id, profile_id)
);

create index if not exists commerce_favorites_profile_idx
  on public.commerce_favorites (profile_id, created_at desc);

alter table public.commerces
  add column if not exists favorites_count integer not null default 0;

create or replace function public.refresh_commerce_favorites_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_commerce_id uuid;
begin
  target_commerce_id := coalesce(new.commerce_id, old.commerce_id);

  update public.commerces
  set favorites_count = (
    select count(*)
    from public.commerce_favorites f
    where f.commerce_id = target_commerce_id
  )
  where id = target_commerce_id;

  return null;
end;
$$;

drop trigger if exists refresh_commerce_favorites_count on public.commerce_favorites;
create trigger refresh_commerce_favorites_count
after insert or delete on public.commerce_favorites
for each row execute function public.refresh_commerce_favorites_count();

alter table public.commerce_favorites enable row level security;

drop policy if exists commerce_favorites_owner_read on public.commerce_favorites;
create policy commerce_favorites_owner_read
on public.commerce_favorites
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);

drop policy if exists commerce_favorites_verified_insert on public.commerce_favorites;
create policy commerce_favorites_verified_insert
on public.commerce_favorites
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
      and p.verification_status = 'verified'
  )
);

drop policy if exists commerce_favorites_owner_delete on public.commerce_favorites;
create policy commerce_favorites_owner_delete
on public.commerce_favorites
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);

grant select, insert, delete on public.commerce_favorites to authenticated;

comment on table public.commerce_favorites is
  'Comercios guardados de forma privada por cada vecino.';
