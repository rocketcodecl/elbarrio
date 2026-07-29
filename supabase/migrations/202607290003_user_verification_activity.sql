-- Coincidencia dirección/GPS y actividad visible para administración.

alter table public.profiles
  add column if not exists email text,
  add column if not exists address_lat double precision,
  add column if not exists address_lng double precision,
  add column if not exists address_match_distance_m integer;

-- El correo de acceso vive originalmente en auth.users. Se copia al perfil
-- para que pueda consultarse desde el panel sin exponer el esquema Auth.
update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.user_id = auth_user.id
  and (profile.email is null or profile.email = '');

create or replace function public.admin_get_user_activity(
  p_target_profile_id uuid
)
returns table (
  activity_type text,
  title text,
  detail text,
  created_at timestamptz,
  reference_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'Acción permitida solo para administradores activos' using errcode = '42501';
  end if;

  return query
  select activity.activity_type, activity.title, activity.detail, activity.created_at, activity.reference_id
  from (
    select
      case post.type
        when 'sell' then 'sale'
        when 'gift' then 'gift'
        when 'trade' then 'trade'
        when 'service' then 'service'
        when 'event' then 'event'
        else 'post'
      end::text as activity_type,
      coalesce(post.title, 'Publicación sin título')::text as title,
      concat_ws(' · ', nullif(post.status, ''), case when post.price is not null then '$' || trim(to_char(post.price, 'FM999G999G999')) end)::text as detail,
      post.created_at,
      post.id as reference_id
    from public.posts post
    where post.author_id = p_target_profile_id

    union all

    select
      'comment'::text,
      'Comentó en una publicación'::text,
      coalesce(comment.content, 'Comentario sin texto')::text,
      comment.created_at,
      comment.id
    from public.comments comment
    where comment.author_id = p_target_profile_id

    union all

    select
      'alert'::text,
      coalesce(incident.title, 'Reportó una alerta')::text,
      concat_ws(' · ', incident.category, incident.status)::text,
      incident.created_at,
      incident.id
    from public.incident_reports incident
    where incident.reporter_id = p_target_profile_id

    union all

    select
      'opinion'::text,
      'Opinó sobre un comercio'::text,
      concat_ws(' · ', review.rating::text || ' estrellas', nullif(review.comment, ''))::text,
      review.created_at,
      review.id
    from public.commerce_reviews review
    where review.reviewer_id = p_target_profile_id
       or (review.reviewer_id is null and review.author_id = p_target_profile_id)
  ) activity
  order by activity.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_get_user_activity(uuid) from public;
grant execute on function public.admin_get_user_activity(uuid) to authenticated;
