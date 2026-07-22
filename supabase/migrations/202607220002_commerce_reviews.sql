-- Opiniones reales de vecinos sobre comercios.
-- Una opinión por perfil y comercio, editable por su autor.

create table if not exists public.commerce_reviews (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerces(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  reviewer_name text,
  reviewer_avatar_url text,
  rating smallint,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_reviews add column if not exists reviewer_id uuid references public.profiles(id) on delete cascade;
alter table public.commerce_reviews add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.commerce_reviews add column if not exists reviewer_name text;
alter table public.commerce_reviews add column if not exists reviewer_avatar_url text;
alter table public.commerce_reviews add column if not exists rating smallint;
alter table public.commerce_reviews add column if not exists comment text;
alter table public.commerce_reviews add column if not exists created_at timestamptz not null default now();
alter table public.commerce_reviews add column if not exists updated_at timestamptz not null default now();

update public.commerce_reviews
set reviewer_id = author_id
where reviewer_id is null and author_id is not null;

create unique index if not exists commerce_reviews_one_per_neighbor_idx
  on public.commerce_reviews (commerce_id, reviewer_id);

create index if not exists commerce_reviews_commerce_created_idx
  on public.commerce_reviews (commerce_id, created_at desc);

alter table public.commerces add column if not exists rating numeric(3, 2) not null default 0;
alter table public.commerces add column if not exists total_reviews integer not null default 0;

create or replace function public.refresh_commerce_review_summary()
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
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.commerce_reviews r
      where r.commerce_id = target_commerce_id
        and r.rating between 1 and 5
    ), 0),
    total_reviews = (
      select count(*)
      from public.commerce_reviews r
      where r.commerce_id = target_commerce_id
        and r.rating between 1 and 5
    )
  where id = target_commerce_id;

  return null;
end;
$$;

drop trigger if exists refresh_commerce_review_summary on public.commerce_reviews;
create trigger refresh_commerce_review_summary
after insert or update or delete on public.commerce_reviews
for each row execute function public.refresh_commerce_review_summary();

alter table public.commerce_reviews enable row level security;

drop policy if exists commerce_reviews_public_read on public.commerce_reviews;
create policy commerce_reviews_public_read
on public.commerce_reviews
for select
to anon, authenticated
using (true);

drop policy if exists commerce_reviews_verified_insert on public.commerce_reviews;
create policy commerce_reviews_verified_insert
on public.commerce_reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = reviewer_id
      and p.user_id = auth.uid()
      and p.verification_status = 'verified'
  )
  and rating between 1 and 5
  and char_length(trim(comment)) between 4 and 800
);

drop policy if exists commerce_reviews_owner_update on public.commerce_reviews;
create policy commerce_reviews_owner_update
on public.commerce_reviews
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = reviewer_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = reviewer_id
      and p.user_id = auth.uid()
      and p.verification_status = 'verified'
  )
  and rating between 1 and 5
  and char_length(trim(comment)) between 4 and 800
);

drop policy if exists commerce_reviews_owner_delete on public.commerce_reviews;
create policy commerce_reviews_owner_delete
on public.commerce_reviews
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = reviewer_id and p.user_id = auth.uid()
  )
);

drop policy if exists commerce_reviews_admin_delete on public.commerce_reviews;
create policy commerce_reviews_admin_delete
on public.commerce_reviews
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

grant select on public.commerce_reviews to anon, authenticated;
grant insert, update, delete on public.commerce_reviews to authenticated;

comment on table public.commerce_reviews is
  'Opiniones de vecinos verificados sobre comercios del barrio.';
