create table if not exists public.neighborhood_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  address text not null,
  comuna text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'activated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists neighborhood_waitlist_comuna_created_idx
  on public.neighborhood_waitlist (comuna, created_at desc);

alter table public.neighborhood_waitlist enable row level security;

create or replace function public.join_neighborhood_waitlist(
  p_email text,
  p_address text,
  p_comuna text,
  p_lat double precision,
  p_lng double precision
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.' using errcode = '42501'; end if;
  if trim(coalesce(p_email, '')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email no válido.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_address, ''))) < 5 or length(trim(coalesce(p_comuna, ''))) < 3 then
    raise exception 'Dirección y comuna requeridas.' using errcode = '22023';
  end if;

  insert into public.neighborhood_waitlist (user_id, email, address, comuna, lat, lng)
  values (auth.uid(), lower(trim(p_email)), trim(p_address), trim(p_comuna), p_lat, p_lng)
  on conflict (user_id) do update set
    email = excluded.email,
    address = excluded.address,
    comuna = excluded.comuna,
    lat = excluded.lat,
    lng = excluded.lng,
    status = 'waiting',
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_list_neighborhood_waitlist()
returns table (
  id uuid,
  email text,
  address text,
  comuna text,
  lat double precision,
  lng double precision,
  status text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;
  if v_admin.id is null then raise exception 'Acceso administrativo requerido.' using errcode = '42501'; end if;

  return query
  select w.id, w.email, w.address, w.comuna, w.lat, w.lng, w.status, w.created_at
  from public.neighborhood_waitlist w
  order by w.created_at desc;
end;
$$;

revoke all on table public.neighborhood_waitlist from anon, authenticated;
revoke all on function public.join_neighborhood_waitlist(text, text, text, double precision, double precision) from public;
revoke all on function public.admin_list_neighborhood_waitlist() from public;
grant execute on function public.join_neighborhood_waitlist(text, text, text, double precision, double precision) to authenticated;
grant execute on function public.admin_list_neighborhood_waitlist() to authenticated;
