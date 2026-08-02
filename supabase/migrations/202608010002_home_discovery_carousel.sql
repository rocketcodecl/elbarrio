-- Portada editorial de Inicio: hasta cinco publicaciones ordenadas por barrio.
-- Ejecutar manualmente en Supabase SQL Editor. No usar `supabase db push`.

alter table public.posts
  add column if not exists home_carousel_order smallint;

alter table public.posts drop constraint if exists posts_home_carousel_order_check;
alter table public.posts
  add constraint posts_home_carousel_order_check
  check (home_carousel_order is null or home_carousel_order between 1 and 5);

create unique index if not exists posts_home_carousel_position_idx
  on public.posts (neighborhood_id, home_carousel_order)
  where home_carousel_order is not null;

comment on column public.posts.home_carousel_order is
  'Posición editorial 1–5 en Para ti, cerca de casa; null significa fuera del carrusel.';

create or replace function public.admin_set_home_discovery_carousel(
  p_neighborhood_id uuid,
  p_post_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_count integer;
  v_post_id uuid;
  v_position integer := 0;
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'No tienes permisos administrativos.';
  end if;
  if p_neighborhood_id is null then
    raise exception 'Selecciona un barrio.';
  end if;
  if coalesce(v_admin.is_superadmin, false) is not true
    and v_admin.neighborhood_id is distinct from p_neighborhood_id then
    raise exception 'No puedes administrar la portada de otro barrio.';
  end if;
  if coalesce(cardinality(p_post_ids), 0) > 5 then
    raise exception 'La portada admite un máximo de cinco contenidos.';
  end if;
  if coalesce(cardinality(p_post_ids), 0) <> coalesce((select count(distinct id) from unnest(p_post_ids) id), 0) then
    raise exception 'No puedes repetir un contenido.';
  end if;

  select count(*) into v_count
  from public.posts
  where id = any(coalesce(p_post_ids, array[]::uuid[]))
    and neighborhood_id = p_neighborhood_id
    and status = 'active'
    and type in ('event', 'news', 'sell', 'gift', 'trade', 'general', 'service')
    and images is not null
    and images::text not in ('[]', '{}', 'null', '');

  if v_count <> coalesce(cardinality(p_post_ids), 0) then
    raise exception 'Todos los contenidos deben estar activos, pertenecer al barrio y tener fotografía.';
  end if;

  update public.posts set home_carousel_order = null
  where neighborhood_id = p_neighborhood_id and home_carousel_order is not null;

  foreach v_post_id in array coalesce(p_post_ids, array[]::uuid[]) loop
    v_position := v_position + 1;
    update public.posts set home_carousel_order = v_position where id = v_post_id;
  end loop;

  return v_position;
end;
$$;

revoke all on function public.admin_set_home_discovery_carousel(uuid, uuid[]) from public;
grant execute on function public.admin_set_home_discovery_carousel(uuid, uuid[]) to authenticated;
