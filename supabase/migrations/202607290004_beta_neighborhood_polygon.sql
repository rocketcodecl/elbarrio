-- Polígono oficial del barrio beta para el MVP.
-- Fuente versionada: supabase/geo/barrio_beta_polygon.geojson

create extension if not exists postgis with schema extensions;
set search_path = public, extensions;

alter table public.neighborhoods
  add column if not exists boundary geometry(MultiPolygon, 4326);

create index if not exists neighborhoods_boundary_gix
  on public.neighborhoods using gist (boundary);

do $$
declare
  v_beta_count integer;
  v_beta_id uuid;
  v_boundary geometry(MultiPolygon, 4326);
begin
  select count(*)
    into v_beta_count
  from public.neighborhoods
  where is_beta is true;

  if v_beta_count <> 1 then
    raise exception 'Se esperaba exactamente un barrio con is_beta=true, pero se encontraron %', v_beta_count;
  end if;

  select id into v_beta_id
  from public.neighborhoods
  where is_beta is true
  limit 1;

  v_boundary := st_multi(st_setsrid(st_geomfromgeojson(
    '{"type":"Polygon","coordinates":[[[-70.580331,-33.431425],[-70.568429,-33.431037],[-70.56504,-33.430922],[-70.563475,-33.425209],[-70.56418,-33.423802],[-70.564215,-33.41806],[-70.564696,-33.416552],[-70.575309,-33.419825],[-70.577407,-33.422567],[-70.577923,-33.42317],[-70.579354,-33.423545],[-70.577094,-33.425933],[-70.58087,-33.429323],[-70.582672,-33.429801],[-70.580956,-33.431472],[-70.580355,-33.431424],[-70.580355,-33.431377],[-70.580331,-33.431425]]]}'
  ), 4326));

  if not st_isvalid(v_boundary) then
    raise exception 'El polígono del barrio beta no es válido';
  end if;

  update public.neighborhoods
  set boundary = v_boundary
  where id = v_beta_id;
end;
$$;

create or replace function public.barrio_en_punto_mvp(
  p_lat double precision,
  p_lng double precision
)
returns setof public.neighborhoods
language sql
stable
security definer
set search_path = public, extensions
as $$
  select neighborhood.*
  from public.neighborhoods neighborhood
  where neighborhood.is_beta is true
    and neighborhood.boundary is not null
    and st_covers(
      neighborhood.boundary,
      st_setsrid(st_point(p_lng, p_lat), 4326)
    )
  limit 1;
$$;

revoke all on function public.barrio_en_punto_mvp(double precision, double precision) from public;
grant execute on function public.barrio_en_punto_mvp(double precision, double precision) to authenticated;
