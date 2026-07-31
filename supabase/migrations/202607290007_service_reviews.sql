-- Opiniones reales de vecinos sobre servicios.
-- Una opinión por vecino y servicio, editable por su autor.

alter table public.posts
  add column if not exists rating numeric(3, 2) not null default 0;

alter table public.posts
  add column if not exists rating_count integer not null default 0;

create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.posts(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_reviews_no_self_review check (reviewer_id <> provider_id),
  constraint service_reviews_comment_length check (
    comment is null or char_length(trim(comment)) between 4 and 800
  )
);

create unique index if not exists service_reviews_one_per_neighbor_idx
  on public.service_reviews (service_id, reviewer_id);

create index if not exists service_reviews_service_created_idx
  on public.service_reviews (service_id, created_at desc);

create or replace function public.refresh_service_review_summary(target_service_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.service_reviews r
      where r.service_id = target_service_id
    ), 0),
    rating_count = (
      select count(*)
      from public.service_reviews r
      where r.service_id = target_service_id
    )
  where id = target_service_id
    and type = 'service';
$$;

create or replace function public.trigger_refresh_service_review_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_service_review_summary(old.service_id);
  else
    perform public.refresh_service_review_summary(new.service_id);
    if tg_op = 'UPDATE' and old.service_id is distinct from new.service_id then
      perform public.refresh_service_review_summary(old.service_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists refresh_service_review_summary on public.service_reviews;
create trigger refresh_service_review_summary
after insert or update or delete on public.service_reviews
for each row execute function public.trigger_refresh_service_review_summary();

update public.posts p
set
  rating = coalesce((
    select round(avg(r.rating)::numeric, 2)
    from public.service_reviews r
    where r.service_id = p.id
  ), 0),
  rating_count = (
    select count(*)
    from public.service_reviews r
    where r.service_id = p.id
  )
where p.type = 'service';

alter table public.service_reviews enable row level security;

drop policy if exists service_reviews_public_read on public.service_reviews;
create policy service_reviews_public_read
on public.service_reviews
for select
to anon, authenticated
using (true);

drop policy if exists service_reviews_verified_insert on public.service_reviews;
create policy service_reviews_verified_insert
on public.service_reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = reviewer_id
      and profile.user_id = auth.uid()
      and profile.verification_status = 'verified'
  )
  and reviewer_id <> provider_id
  and exists (
    select 1
    from public.posts service
    where service.id = service_id
      and service.type = 'service'
      and service.status = 'active'
      and service.author_id = provider_id
  )
);

drop policy if exists service_reviews_owner_update on public.service_reviews;
create policy service_reviews_owner_update
on public.service_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = reviewer_id
      and profile.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = reviewer_id
      and profile.user_id = auth.uid()
      and profile.verification_status = 'verified'
  )
  and reviewer_id <> provider_id
  and exists (
    select 1
    from public.posts service
    where service.id = service_id
      and service.type = 'service'
      and service.status = 'active'
      and service.author_id = provider_id
  )
);

drop policy if exists service_reviews_owner_delete on public.service_reviews;
create policy service_reviews_owner_delete
on public.service_reviews
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = reviewer_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists service_reviews_admin_delete on public.service_reviews;
create policy service_reviews_admin_delete
on public.service_reviews
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.user_id = auth.uid()
      and profile.role = 'admin'
  )
);

grant select on public.service_reviews to anon, authenticated;
grant insert, update, delete on public.service_reviews to authenticated;

comment on table public.service_reviews is
  'Calificaciones y comentarios de vecinos verificados sobre servicios del barrio.';
