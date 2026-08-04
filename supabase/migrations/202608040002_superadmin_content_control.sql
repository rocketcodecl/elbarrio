-- Control editorial del superadministrador: categorías dinámicas y moderación
-- trazable de publicaciones. Ejecutar manualmente en Supabase SQL Editor.

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('marketplace', 'service', 'incident')),
  key text not null,
  name text not null,
  icon text not null default '📌',
  description text,
  expires_hours integer check (expires_hours is null or expires_hours between 1 and 720),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_scope_key_unique unique (scope, key),
  constraint content_categories_key_not_blank check (length(trim(key)) > 0),
  constraint content_categories_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists content_categories_scope_order_idx
  on public.content_categories (scope, is_active, sort_order, name);

alter table public.content_categories enable row level security;

drop policy if exists "authenticated read active content categories" on public.content_categories;
create policy "authenticated read active content categories"
  on public.content_categories for select to authenticated
  using (
    is_active
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and coalesce(p.is_superadmin, false)
    )
  );

drop policy if exists "superadmins manage content categories" on public.content_categories;
create policy "superadmins manage content categories"
  on public.content_categories for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and coalesce(p.is_superadmin, false)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and coalesce(p.is_superadmin, false)
    )
  );

grant select, insert, update on public.content_categories to authenticated;

insert into public.content_categories (scope, key, name, icon, description, expires_hours, sort_order)
values
  ('marketplace','Electrónica','Electrónica','📱',null,null,10),
  ('marketplace','Ropa','Ropa','👕',null,null,20),
  ('marketplace','Hogar','Hogar','🏠',null,null,30),
  ('marketplace','Deportes','Deportes','⚽',null,null,40),
  ('marketplace','Libros','Libros','📚',null,null,50),
  ('marketplace','Juguetes','Juguetes','🧸',null,null,60),
  ('marketplace','Muebles','Muebles','🪑',null,null,70),
  ('marketplace','Bicicletas','Bicicletas','🚲',null,null,80),
  ('marketplace','Mascotas','Mascotas','🐾',null,null,90),
  ('marketplace','Herramientas','Herramientas','🔨',null,null,100),
  ('marketplace','Otros','Otros','📦',null,null,110),
  ('service','gasfiter','Gasfitería','🔧',null,null,10),
  ('service','electrico','Electricidad','💡',null,null,20),
  ('service','cerrajero','Cerrajería','🔑',null,null,30),
  ('service','pintor','Pintura','🎨',null,null,40),
  ('service','carpintero','Carpintería','🪚',null,null,50),
  ('service','maestro','Maestro','🧱',null,null,60),
  ('service','aseo','Limpieza','🧹',null,null,70),
  ('service','jardinero','Jardinería','🌱',null,null,80),
  ('service','peluqueria','Peluquería','💇',null,null,90),
  ('service','mascotas','Mascotas','🐕',null,null,100),
  ('service','ninera','Niñera','👶',null,null,110),
  ('service','adulto_mayor','Adulto mayor','👵',null,null,120),
  ('service','fletes','Fletes','🚚',null,null,130),
  ('service','clases','Clases','📖',null,null,140),
  ('service','internet','Internet y redes','📶',null,null,150),
  ('service','aire','Aire acondicionado','❄️',null,null,160),
  ('service','fumigacion','Fumigación','🐜',null,null,170),
  ('service','otro','Otro','🛠️',null,null,180),
  ('incident','seguridad','Seguridad','🚨','Robo, sospecha, intrusión',6,10),
  ('incident','incendio','Incendio','🔥','Fuego, humo o riesgo',6,20),
  ('incident','servicios','Servicios','🛠️','Calles, tránsito y espacios',48,30),
  ('incident','animales','Animales','🐾','Perdidos, heridos o sueltos',72,40),
  ('incident','fugas','Fugas','💧','Agua, gas u otra fuga',24,50),
  ('incident','luz','Luz','💡','Corte, poste o cableado',24,60),
  ('incident','salud','Salud','🏥','Riesgo o emergencia médica',6,70),
  ('incident','otro','Otros','📌','Otra alerta del barrio',24,80)
on conflict (scope, key) do nothing;

create table if not exists public.post_admin_actions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete restrict,
  admin_profile_id uuid not null references public.profiles(id),
  action text not null check (action in ('hide', 'restore', 'close', 'remove')),
  reason text not null,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now(),
  constraint post_admin_actions_reason_not_blank check (length(trim(reason)) >= 3)
);

create index if not exists post_admin_actions_post_created_idx
  on public.post_admin_actions (post_id, created_at desc);

alter table public.post_admin_actions enable row level security;

drop policy if exists "superadmins read post moderation actions" on public.post_admin_actions;
create policy "superadmins read post moderation actions"
  on public.post_admin_actions for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and coalesce(p.is_superadmin, false)
    )
  );

grant select on public.post_admin_actions to authenticated;

create or replace function public.admin_moderate_post(
  p_post_id uuid,
  p_action text,
  p_reason text
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid;
  v_before public.posts%rowtype;
  v_after public.posts%rowtype;
  v_new_status text;
begin
  select p.id into v_admin_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and lower(coalesce(p.role, '')) = 'admin'
    and coalesce(p.is_superadmin, false)
  limit 1;

  if v_admin_profile_id is null then
    raise exception 'Acción permitida solo para el superadministrador' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Debes registrar un motivo' using errcode = '22023';
  end if;

  select * into v_before from public.posts where id = p_post_id for update;
  if not found then
    raise exception 'Publicación no encontrada' using errcode = 'P0002';
  end if;

  v_new_status := case p_action
    when 'hide' then 'rejected'
    when 'restore' then 'active'
    when 'close' then 'closed'
    when 'remove' then 'removed'
    else null
  end;
  if v_new_status is null then
    raise exception 'Acción de moderación no válida' using errcode = '22023';
  end if;

  update public.posts
  set status = v_new_status,
      is_featured = case when p_action in ('hide','close','remove') then false else is_featured end,
      show_in_activity = case when p_action in ('hide','close','remove') then false else show_in_activity end,
      show_on_home = case when p_action in ('hide','close','remove') then false else show_on_home end,
      home_carousel_order = case when p_action in ('hide','close','remove') then null else home_carousel_order end
  where id = p_post_id
  returning * into v_after;

  insert into public.post_admin_actions (
    post_id, admin_profile_id, action, reason, previous_status, new_status
  ) values (
    p_post_id, v_admin_profile_id, p_action, trim(p_reason), v_before.status, v_after.status
  );

  return v_after;
end;
$$;

revoke all on function public.admin_moderate_post(uuid, text, text) from public;
grant execute on function public.admin_moderate_post(uuid, text, text) to authenticated;

create or replace function public.prevent_member_restoring_moderated_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and old.status in ('rejected', 'removed')
    and new.status is distinct from old.status
    and not exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
        and coalesce(p.is_superadmin, false)
    )
  then
    raise exception 'Esta publicación fue retirada por moderación' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_moderated_post_status on public.posts;
create trigger protect_moderated_post_status
before update of status on public.posts
for each row execute function public.prevent_member_restoring_moderated_post();
