-- Eventos: opciones de acceso y autorización de publicadores.
-- La autorización se aplica en la base, no solo en la interfaz.

alter table public.profiles
  add column if not exists can_publish_events boolean not null default false;

alter table public.posts
  add column if not exists event_entry_type text,
  add column if not exists event_price numeric,
  add column if not exists event_pet_friendly boolean not null default false,
  add column if not exists event_accessible boolean not null default false,
  add column if not exists event_family_friendly boolean not null default false,
  add column if not exists event_requires_registration boolean not null default false,
  add column if not exists event_capacity integer,
  add column if not exists event_registration_url text;

alter table public.posts drop constraint if exists posts_event_entry_type_check;
alter table public.posts add constraint posts_event_entry_type_check
  check (event_entry_type is null or event_entry_type in ('free', 'paid'));

alter table public.posts drop constraint if exists posts_event_price_check;
alter table public.posts add constraint posts_event_price_check
  check (event_price is null or event_price >= 0);

alter table public.posts drop constraint if exists posts_event_capacity_check;
alter table public.posts add constraint posts_event_capacity_check
  check (event_capacity is null or event_capacity > 0);

create or replace function public.enforce_event_publisher_authorization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'event'
     and coalesce(auth.role(), '') <> 'service_role'
     and not exists (
       select 1
       from public.profiles p
       where p.user_id = auth.uid()
         and (p.role = 'admin' or p.can_publish_events = true)
     )
  then
    raise exception 'No autorizado para publicar eventos'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_event_publisher_authorization on public.posts;
create trigger enforce_event_publisher_authorization
before insert or update on public.posts
for each row execute function public.enforce_event_publisher_authorization();

comment on column public.profiles.can_publish_events is
  'Autoriza a una cuenta no administradora, por ejemplo una junta de vecinos, a publicar eventos.';

