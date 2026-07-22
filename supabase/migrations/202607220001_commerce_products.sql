-- Catálogo de productos destacados por comercio.
-- Lectura pública solo para productos disponibles.
-- Escritura limitada a administradores o al perfil asociado al comercio.

create table if not exists public.commerce_products (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  price numeric(12, 2) check (price is null or price >= 0),
  unit_label text,
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commerce_products_commerce_id_idx
  on public.commerce_products (commerce_id);

create index if not exists commerce_products_feed_idx
  on public.commerce_products (commerce_id, is_available, is_featured, sort_order);

create or replace function public.can_manage_commerce(target_commerce_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and (
        p.role = 'admin'
        or exists (
          select 1
          from public.commerces c
          where c.id = target_commerce_id
            and c.owner_id = p.id
        )
      )
  );
$$;

revoke all on function public.can_manage_commerce(uuid) from public;
grant execute on function public.can_manage_commerce(uuid) to authenticated;

create or replace function public.set_commerce_product_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_commerce_product_updated_at on public.commerce_products;
create trigger set_commerce_product_updated_at
before update on public.commerce_products
for each row execute function public.set_commerce_product_updated_at();

alter table public.commerce_products enable row level security;

drop policy if exists commerce_products_read_available on public.commerce_products;
create policy commerce_products_read_available
on public.commerce_products
for select
to anon, authenticated
using (is_available = true);

drop policy if exists commerce_products_manager_read on public.commerce_products;
create policy commerce_products_manager_read
on public.commerce_products
for select
to authenticated
using (public.can_manage_commerce(commerce_id));

drop policy if exists commerce_products_manager_insert on public.commerce_products;
create policy commerce_products_manager_insert
on public.commerce_products
for insert
to authenticated
with check (public.can_manage_commerce(commerce_id));

drop policy if exists commerce_products_manager_update on public.commerce_products;
create policy commerce_products_manager_update
on public.commerce_products
for update
to authenticated
using (public.can_manage_commerce(commerce_id))
with check (public.can_manage_commerce(commerce_id));

drop policy if exists commerce_products_manager_delete on public.commerce_products;
create policy commerce_products_manager_delete
on public.commerce_products
for delete
to authenticated
using (public.can_manage_commerce(commerce_id));

grant select on public.commerce_products to anon, authenticated;
grant insert, update, delete on public.commerce_products to authenticated;

comment on table public.commerce_products is
  'Catálogo visible en el detalle de cada comercio del barrio.';
