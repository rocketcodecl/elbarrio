-- Notificaciones internas generadas desde acciones sociales.
-- notifications.user_id y notifications.from_user_id referencian profiles.id.

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  if new.receiver_id is null or new.sender_id is null or new.receiver_id = new.sender_id then
    return new;
  end if;

  select full_name into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, from_user_id, type, title, body, post_id, read)
  values (
    new.receiver_id,
    new.sender_id,
    'message',
    'Nuevo mensaje',
    coalesce(sender_name, 'Un vecino') || ': ' || left(coalesce(new.content, ''), 140),
    new.post_id,
    false
  );
  return new;
end;
$$;

drop trigger if exists create_notification_from_message on public.messages;
create trigger create_notification_from_message
after insert on public.messages
for each row execute function public.notify_new_message();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  author_name text;
  post_title text;
begin
  if new.post_id is null or new.author_id is null then return new; end if;

  if new.parent_id is not null then
    select author_id into recipient_id from public.comments where id = new.parent_id;
  end if;
  select coalesce(recipient_id, author_id), title into recipient_id, post_title
  from public.posts where id = new.post_id;
  if recipient_id is null or recipient_id = new.author_id then return new; end if;

  select full_name into author_name from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, from_user_id, type, title, body, post_id, read)
  values (
    recipient_id,
    new.author_id,
    'reply',
    case when new.parent_id is null then 'Comentaron tu publicación' else 'Respondieron tu comentario' end,
    coalesce(author_name, 'Un vecino') || ' comentó en “' || left(coalesce(post_title, 'tu publicación'), 70) || '”',
    new.post_id,
    false
  );
  return new;
end;
$$;

drop trigger if exists create_notification_from_comment on public.comments;
create trigger create_notification_from_comment
after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  actor_id uuid;
  actor_name text;
  post_title text;
begin
  select id, full_name into actor_id, actor_name
  from public.profiles
  where id = new.user_id or user_id = new.user_id
  limit 1;

  select author_id, title into recipient_id, post_title
  from public.posts where id = new.post_id;
  if recipient_id is null or actor_id is null or recipient_id = actor_id then return new; end if;

  insert into public.notifications (user_id, from_user_id, type, title, body, post_id, read)
  values (
    recipient_id,
    actor_id,
    'like',
    'A alguien le gustó tu publicación',
    coalesce(actor_name, 'Un vecino') || ' indicó que le gusta “' || left(coalesce(post_title, 'tu publicación'), 70) || '”',
    new.post_id,
    false
  );
  return new;
end;
$$;

drop trigger if exists create_notification_from_post_like on public.post_likes;
create trigger create_notification_from_post_like
after insert on public.post_likes
for each row execute function public.notify_new_post_like();

-- Garantiza que INSERT/UPDATE lleguen al contador y listado en tiempo real.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
