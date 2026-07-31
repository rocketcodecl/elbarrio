create table if not exists public.app_content_pages (
  slug text primary key check (slug in ('privacy_security', 'about')),
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.app_content_pages (slug)
values ('privacy_security'), ('about')
on conflict (slug) do nothing;

alter table public.app_content_pages enable row level security;

drop policy if exists app_content_pages_read_authenticated on public.app_content_pages;
create policy app_content_pages_read_authenticated
  on public.app_content_pages for select
  to authenticated
  using (true);

create or replace function public.admin_update_app_content(p_slug text, p_content jsonb)
returns public.app_content_pages
language plpgsql security definer set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_result public.app_content_pages%rowtype;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(is_superadmin, false) = true
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;

  if v_admin.id is null then
    raise exception 'Se requiere acceso de superadministrador.' using errcode = '42501';
  end if;
  if p_slug not in ('privacy_security', 'about') then
    raise exception 'Página no válida.' using errcode = '22023';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'El contenido debe ser un objeto válido.' using errcode = '22023';
  end if;

  insert into public.app_content_pages (slug, content, updated_by, updated_at)
  values (p_slug, p_content, v_admin.id, now())
  on conflict (slug) do update set
    content = excluded.content,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on table public.app_content_pages from anon;
revoke insert, update, delete on table public.app_content_pages from authenticated;
revoke all on function public.admin_update_app_content(text, jsonb) from public;
grant select on table public.app_content_pages to authenticated;
grant execute on function public.admin_update_app_content(text, jsonb) to authenticated;
