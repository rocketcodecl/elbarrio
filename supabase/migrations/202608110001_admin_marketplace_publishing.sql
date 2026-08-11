-- Publicación segura de artículos del Mercado desde el panel Ultra Admin.
-- La acción puede atribuirse a un perfil activo del mismo barrio para que
-- mensajes, ofertas y cierres continúen llegando al vendedor correcto.

create or replace function public.admin_create_marketplace_post(
  p_neighborhood_id uuid,
  p_author_id uuid,
  p_type text,
  p_title text,
  p_content text default null,
  p_category text default null,
  p_price numeric default null,
  p_is_negotiable boolean default false,
  p_looking_for text default null,
  p_images text[] default null
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_author public.profiles%rowtype;
  v_post public.posts%rowtype;
  v_type text := lower(trim(coalesce(p_type, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_content text := nullif(trim(coalesce(p_content, '')), '');
  v_category text := nullif(trim(coalesce(p_category, '')), '');
  v_looking_for text := nullif(trim(coalesce(p_looking_for, '')), '');
begin
  select * into v_admin
  from public.profiles
  where user_id = auth.uid()
    and lower(coalesce(role, '')) = 'admin'
    and coalesce(is_superadmin, false)
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_admin.id is null then
    raise exception 'Acción permitida solo para el superadministrador' using errcode = '42501';
  end if;

  if p_neighborhood_id is null or not exists (
    select 1 from public.neighborhoods where id = p_neighborhood_id
  ) then
    raise exception 'Selecciona un barrio válido' using errcode = '22023';
  end if;

  select * into v_author
  from public.profiles
  where id = p_author_id
    and neighborhood_id = p_neighborhood_id
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_author.id is null then
    raise exception 'Selecciona un vendedor activo del barrio' using errcode = '22023';
  end if;

  if v_type not in ('sell', 'gift', 'trade') then
    raise exception 'Tipo de publicación de Mercado no válido' using errcode = '22023';
  end if;
  if length(v_title) < 3 or length(v_title) > 60 then
    raise exception 'El título debe tener entre 3 y 60 caracteres' using errcode = '22023';
  end if;
  if v_content is null or length(v_content) > 500 then
    raise exception 'La descripción es obligatoria y admite hasta 500 caracteres' using errcode = '22023';
  end if;
  if v_type = 'sell' and (p_price is null or p_price < 0) then
    raise exception 'Indica un precio válido para la venta' using errcode = '22023';
  end if;
  if v_type = 'trade' and (v_looking_for is null or length(v_looking_for) > 120) then
    raise exception 'Indica qué se busca a cambio' using errcode = '22023';
  end if;
  if coalesce(array_length(p_images, 1), 0) > 4 then
    raise exception 'Puedes publicar hasta cuatro fotografías' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_images, array[]::text[])) as image_url
    where image_url !~* '^https?://'
  ) then
    raise exception 'Las fotografías contienen una dirección no válida' using errcode = '22023';
  end if;

  insert into public.posts (
    author_id, neighborhood_id, type, title, content, images, category,
    price, is_negotiable, looking_for, status
  ) values (
    v_author.id,
    p_neighborhood_id,
    v_type,
    v_title,
    v_content,
    case when coalesce(array_length(p_images, 1), 0) > 0 then p_images else null end,
    v_category,
    case when v_type = 'sell' then p_price else null end,
    case when v_type = 'sell' then coalesce(p_is_negotiable, false) else false end,
    case when v_type = 'trade' then v_looking_for else null end,
    'active'
  ) returning * into v_post;

  insert into public.post_admin_actions (
    post_id, admin_profile_id, action, reason, previous_status, new_status, details
  ) values (
    v_post.id,
    v_admin.id,
    'create',
    'Publicación creada desde el panel administrativo',
    null,
    v_post.status,
    jsonb_build_object(
      'type', v_post.type,
      'author_id', v_post.author_id,
      'neighborhood_id', v_post.neighborhood_id
    )
  );

  return v_post;
end;
$$;

revoke all on function public.admin_create_marketplace_post(
  uuid, uuid, text, text, text, text, numeric, boolean, text, text[]
) from public;
grant execute on function public.admin_create_marketplace_post(
  uuid, uuid, text, text, text, text, numeric, boolean, text, text[]
) to authenticated;

comment on function public.admin_create_marketplace_post(
  uuid, uuid, text, text, text, text, numeric, boolean, text, text[]
) is 'Crea publicaciones de Mercado desde el panel Ultra Admin con autor y barrio explícitos y auditoría.';
