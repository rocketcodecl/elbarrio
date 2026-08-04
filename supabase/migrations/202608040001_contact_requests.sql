create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  name text not null,
  email text not null,
  reason text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_requests_status_created_idx
  on public.contact_requests (status, created_at desc);
create index if not exists contact_requests_neighborhood_idx
  on public.contact_requests (neighborhood_id, created_at desc);

alter table public.contact_requests enable row level security;
revoke all on table public.contact_requests from anon, authenticated;

create or replace function public.submit_contact_request(
  p_name text,
  p_email text,
  p_reason text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'Ingresa tu nombre'; end if;
  if position('@' in coalesce(p_email, '')) < 2 then raise exception 'Ingresa un correo válido'; end if;
  if length(btrim(coalesce(p_message, ''))) < 5 then raise exception 'Escribe un mensaje'; end if;

  select * into v_profile from public.profiles where user_id = auth.uid();
  insert into public.contact_requests (user_id, profile_id, neighborhood_id, name, email, reason, message)
  values (auth.uid(), v_profile.id, v_profile.neighborhood_id, btrim(p_name), lower(btrim(p_email)), btrim(p_reason), btrim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_list_contact_requests()
returns setof public.contact_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where user_id = auth.uid();
  if v_admin.id is null or lower(coalesce(v_admin.role, '')) <> 'admin' then
    raise exception 'Acceso denegado';
  end if;
  return query
    select cr.* from public.contact_requests cr
    where v_admin.is_superadmin is true or cr.neighborhood_id = v_admin.neighborhood_id
    order by case cr.status when 'new' then 0 when 'in_progress' then 1 else 2 end, cr.created_at desc;
end;
$$;

create or replace function public.admin_update_contact_request_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  if p_status not in ('new', 'in_progress', 'resolved') then raise exception 'Estado inválido'; end if;
  select * into v_admin from public.profiles where user_id = auth.uid();
  if v_admin.id is null or lower(coalesce(v_admin.role, '')) <> 'admin' then
    raise exception 'Acceso denegado';
  end if;
  update public.contact_requests
  set status = p_status, updated_at = now()
  where id = p_id and (v_admin.is_superadmin is true or neighborhood_id = v_admin.neighborhood_id);
end;
$$;

revoke all on function public.submit_contact_request(text,text,text,text) from public;
revoke all on function public.admin_list_contact_requests() from public;
revoke all on function public.admin_update_contact_request_status(uuid,text) from public;
grant execute on function public.submit_contact_request(text,text,text,text) to authenticated;
grant execute on function public.admin_list_contact_requests() to authenticated;
grant execute on function public.admin_update_contact_request_status(uuid,text) to authenticated;
