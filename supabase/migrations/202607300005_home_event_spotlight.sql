-- Control editorial independiente para la portada “Hoy en tu barrio”.
-- Por defecto ningún evento aparece en portada. El panel puede seleccionar
-- uno por barrio sin alterar su aparición opcional en Actividad.

alter table public.posts
  add column if not exists show_on_home boolean not null default false;

create unique index if not exists posts_home_event_spotlight_unique_idx
  on public.posts (neighborhood_id)
  where type = 'event' and show_on_home = true;

create index if not exists posts_home_event_spotlight_feed_idx
  on public.posts (neighborhood_id, starts_at)
  where type = 'event' and status = 'active' and show_on_home = true;

comment on column public.posts.show_on_home is
  'Selecciona un único evento por barrio para la portada Hoy en tu barrio.';

create or replace function public.admin_set_home_event_spotlight(
  p_event_id uuid,
  p_show boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_event public.posts%rowtype;
begin
  select *
    into v_admin
  from public.profiles
  where user_id = auth.uid()
    and role = 'admin'
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'No tienes permisos administrativos.';
  end if;

  select *
    into v_event
  from public.posts
  where id = p_event_id
    and type = 'event'
  for update;

  if v_event.id is null then
    raise exception 'El evento no existe.';
  end if;

  if coalesce(v_admin.is_superadmin, false) is not true
    and v_admin.neighborhood_id is distinct from v_event.neighborhood_id then
    raise exception 'No puedes administrar eventos de otro barrio.';
  end if;

  if p_show then
    update public.posts
    set show_on_home = false
    where type = 'event'
      and neighborhood_id = v_event.neighborhood_id
      and show_on_home = true
      and id <> v_event.id;
  end if;

  update public.posts
  set show_on_home = p_show
  where id = v_event.id;
end;
$$;

revoke all on function public.admin_set_home_event_spotlight(uuid, boolean) from public;
grant execute on function public.admin_set_home_event_spotlight(uuid, boolean) to authenticated;
