-- Invitaciones vecinales trazables. Una invitación solo cuenta cuando el invitado
-- completa la verificación territorial; compartir un enlace nunca otorga premios.

alter table public.profiles
  add column if not exists invite_code text;

alter table public.profiles
  add column if not exists badge_connector boolean not null default false;

create unique index if not exists profiles_invite_code_unique
  on public.profiles (invite_code)
  where invite_code is not null;

create table if not exists public.neighbor_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  invited_profile_id uuid not null references public.profiles(id) on delete cascade,
  neighborhood_id uuid references public.neighborhoods(id),
  invite_code text not null,
  status text not null default 'started' check (status in ('started', 'verified')),
  started_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint neighbor_invites_different_profiles check (inviter_profile_id <> invited_profile_id),
  constraint neighbor_invites_one_inviter_per_profile unique (invited_profile_id)
);

create index if not exists neighbor_invites_inviter_idx
  on public.neighbor_invites (inviter_profile_id, status, started_at desc);

alter table public.neighbor_invites enable row level security;

drop policy if exists neighbor_invites_read_own on public.neighbor_invites;
create policy neighbor_invites_read_own
  on public.neighbor_invites for select
  to authenticated
  using (
    inviter_profile_id in (select id from public.profiles where user_id = auth.uid())
    or invited_profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create or replace function public.ensure_neighbor_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null or btrim(new.invite_code) = '' then
    new.invite_code := upper(substr(md5(new.id::text || clock_timestamp()::text || random()::text), 1, 10));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_neighbor_invite_code on public.profiles;
create trigger profiles_ensure_neighbor_invite_code
before insert or update of invite_code on public.profiles
for each row execute function public.ensure_neighbor_invite_code();

update public.profiles
set invite_code = upper(substr(md5(id::text || clock_timestamp()::text || random()::text), 1, 10))
where invite_code is null;

alter table public.profiles alter column invite_code set not null;

create or replace function public.get_my_neighbor_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_result jsonb;
begin
  select * into v_profile
  from public.profiles
  where user_id = auth.uid()
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;

  if v_profile.id is null then
    raise exception 'Perfil no disponible.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'invite_code', v_profile.invite_code,
    'verified_count', count(*) filter (where ni.status = 'verified'),
    'started_count', count(*) filter (where ni.status = 'started'),
    'badge_connector', coalesce(v_profile.badge_connector, false),
    'invites', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', ni.id,
        'status', ni.status,
        'started_at', ni.started_at,
        'verified_at', ni.verified_at,
        'name', case when ni.status = 'verified' then coalesce(ip.full_name, 'Vecino verificado') else 'Invitación en proceso' end
      ) order by ni.started_at desc
    ) filter (where ni.id is not null), '[]'::jsonb)
  ) into v_result
  from public.neighbor_invites ni
  left join public.profiles ip on ip.id = ni.invited_profile_id
  where ni.inviter_profile_id = v_profile.id;

  return coalesce(v_result, jsonb_build_object(
    'invite_code', v_profile.invite_code,
    'verified_count', 0,
    'started_count', 0,
    'badge_connector', coalesce(v_profile.badge_connector, false),
    'invites', '[]'::jsonb
  ));
end;
$$;

create or replace function public.accept_neighbor_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invited public.profiles%rowtype;
  v_inviter public.profiles%rowtype;
  v_invite public.neighbor_invites%rowtype;
  v_status text;
  v_verified_count integer;
begin
  select * into v_invited from public.profiles where user_id = auth.uid() limit 1;
  if v_invited.id is null then
    raise exception 'Completa tu perfil antes de aceptar la invitación.' using errcode = '22023';
  end if;

  select * into v_inviter
  from public.profiles
  where invite_code = upper(btrim(coalesce(p_invite_code, '')))
    and coalesce(account_status, 'active') <> 'suspended'
  limit 1;

  if v_inviter.id is null then
    raise exception 'La invitación no es válida.' using errcode = '22023';
  end if;
  if v_inviter.id = v_invited.id then
    raise exception 'No puedes aceptar tu propia invitación.' using errcode = '22023';
  end if;

  v_status := case when v_invited.verification_status = 'verified' or coalesce(v_invited.verified, false) or v_invited.verified_at is not null then 'verified' else 'started' end;

  insert into public.neighbor_invites (
    inviter_profile_id, invited_profile_id, neighborhood_id, invite_code, status, verified_at
  ) values (
    v_inviter.id, v_invited.id, v_invited.neighborhood_id, v_inviter.invite_code, v_status,
    case when v_status = 'verified' then coalesce(v_invited.verified_at, now()) end
  )
  on conflict (invited_profile_id) do nothing
  returning * into v_invite;

  if v_invite.id is not null and v_status = 'verified' then
    select count(*) into v_verified_count
    from public.neighbor_invites
    where inviter_profile_id = v_inviter.id and status = 'verified';

    if v_verified_count >= 5 then
      update public.profiles set badge_connector = true where id = v_inviter.id;
    end if;

    insert into public.notifications (user_id, from_user_id, type, title, body, read)
    values (
      v_inviter.id,
      v_invited.id,
      'invite_verified',
      'Tu invitación ya es parte del barrio',
      coalesce(v_invited.full_name, 'Tu vecino') || ' ya tenía su residencia verificada. Llevas ' || v_verified_count || ' de 5 para obtener la insignia Conector.',
      false
    );
  end if;

  return jsonb_build_object('accepted', true, 'status', v_status);
end;
$$;

create or replace function public.sync_verified_neighbor_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.neighbor_invites%rowtype;
  v_verified_count integer;
begin
  if not (new.verification_status = 'verified' or coalesce(new.verified, false) or new.verified_at is not null) then
    return new;
  end if;

  update public.neighbor_invites
  set status = 'verified', neighborhood_id = new.neighborhood_id, verified_at = coalesce(new.verified_at, now())
  where invited_profile_id = new.id and status <> 'verified'
  returning * into v_invite;

  if v_invite.id is null then return new; end if;

  select count(*) into v_verified_count
  from public.neighbor_invites
  where inviter_profile_id = v_invite.inviter_profile_id and status = 'verified';

  if v_verified_count >= 5 then
    update public.profiles set badge_connector = true where id = v_invite.inviter_profile_id;
  end if;

  insert into public.notifications (user_id, from_user_id, type, title, body, read)
  values (
    v_invite.inviter_profile_id,
    new.id,
    'invite_verified',
    'Tu invitación ya es parte del barrio',
    coalesce(new.full_name, 'Tu vecino') || ' verificó su residencia. Llevas ' || v_verified_count || ' de 5 para obtener la insignia Conector.',
    false
  );

  return new;
end;
$$;

drop trigger if exists profiles_sync_verified_neighbor_invite on public.profiles;
create trigger profiles_sync_verified_neighbor_invite
after update of verification_status, verified, verified_at on public.profiles
for each row execute function public.sync_verified_neighbor_invite();

create or replace function public.admin_list_neighbor_invite_metrics()
returns table (
  neighborhood_id uuid,
  neighborhood_name text,
  started_count bigint,
  verified_count bigint,
  connector_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles
  where user_id = auth.uid() and role = 'admin' and coalesce(account_status, 'active') <> 'suspended'
  limit 1;
  if v_admin.id is null then raise exception 'Acceso administrativo requerido.' using errcode = '42501'; end if;

  return query
  select
    n.id,
    n.name,
    (select count(*) from public.neighbor_invites ni where ni.neighborhood_id = n.id and ni.status = 'started'),
    (select count(*) from public.neighbor_invites ni where ni.neighborhood_id = n.id and ni.status = 'verified'),
    (select count(*) from public.profiles p where p.neighborhood_id = n.id and coalesce(p.badge_connector, false))
  from public.neighborhoods n
  where coalesce(v_admin.is_superadmin, false) or n.id = v_admin.neighborhood_id
  order by n.name;
end;
$$;

revoke all on table public.neighbor_invites from anon;
revoke insert, update, delete on table public.neighbor_invites from authenticated;
revoke all on function public.get_my_neighbor_invites() from public;
revoke all on function public.accept_neighbor_invite(text) from public;
revoke all on function public.admin_list_neighbor_invite_metrics() from public;
grant select on table public.neighbor_invites to authenticated;
grant execute on function public.get_my_neighbor_invites() to authenticated;
grant execute on function public.accept_neighbor_invite(text) to authenticated;
grant execute on function public.admin_list_neighbor_invite_metrics() to authenticated;
