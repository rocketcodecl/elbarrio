-- Registro privado de instalaciones Android para notificaciones push.
-- Ejecutar manualmente en SQL Editor. No usar `supabase db push`.

create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists push_device_tokens_profile_active_idx
  on public.push_device_tokens (profile_id, is_active);

alter table public.push_device_tokens enable row level security;

revoke all on table public.push_device_tokens from anon, authenticated;

create or replace function public.register_push_device(
  p_token text,
  p_platform text default 'android'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_token text := trim(coalesce(p_token, ''));
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;
  if p_platform not in ('android', 'ios') then
    raise exception 'Plataforma no válida' using errcode = '22023';
  end if;
  if length(v_token) < 20 or length(v_token) > 4096 then
    raise exception 'Token push no válido' using errcode = '22023';
  end if;

  select id into v_profile_id
  from public.profiles
  where user_id = auth.uid()
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;

  if v_profile_id is null then
    raise exception 'Perfil activo requerido' using errcode = '42501';
  end if;

  insert into public.push_device_tokens (profile_id, token, platform, is_active, last_seen_at)
  values (v_profile_id, v_token, p_platform, true, now())
  on conflict (token) do update
    set profile_id = excluded.profile_id,
        platform = excluded.platform,
        is_active = true,
        last_seen_at = now();
end;
$$;

create or replace function public.unregister_push_device(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_device_tokens token_row
  set is_active = false,
      last_seen_at = now()
  where token_row.token = trim(coalesce(p_token, ''))
    and token_row.profile_id in (
      select id from public.profiles where user_id = auth.uid()
    );
end;
$$;

revoke all on function public.register_push_device(text, text) from public;
revoke all on function public.unregister_push_device(text) from public;
grant execute on function public.register_push_device(text, text) to authenticated;
grant execute on function public.unregister_push_device(text) to authenticated;

