-- Corrige la creación de publicaciones desde la app principal.
-- posts.author_id referencia profiles.id, no auth.users.id.

drop policy if exists posts_insert_from_own_profile on public.posts;
create policy posts_insert_from_own_profile
on public.posts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = posts.author_id
      and profile.user_id = auth.uid()
      and profile.neighborhood_id is not null
      and profile.neighborhood_id = posts.neighborhood_id
      and coalesce(profile.account_status, 'active') = 'active'
      and (
        lower(coalesce(profile.role, '')) = 'admin'
        or coalesce(profile.verified, false)
        or profile.verification_status = 'verified'
        or profile.verified_at is not null
      )
      and (
        case
          when posts.type = 'event' then
            lower(coalesce(profile.role, '')) = 'admin'
            or coalesce(profile.can_publish_events, false)
          when posts.type = 'news' then
            lower(coalesce(profile.role, '')) = 'admin'
          else posts.type in ('sell', 'gift', 'trade', 'request', 'service', 'general')
        end
      )
      and (
        lower(coalesce(profile.role, '')) = 'admin'
        or case
          when posts.type = 'service' then coalesce(posts.status, 'pending') = 'pending'
          else coalesce(posts.status, 'active') = 'active'
        end
      )
  )
);

grant insert on public.posts to authenticated;
