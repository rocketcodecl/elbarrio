-- Enlaces editoriales y administración segura de publicaciones propias.
alter table public.posts add column if not exists news_url text;
alter table public.posts drop constraint if exists posts_news_url_http_check;
alter table public.posts add constraint posts_news_url_http_check
  check (news_url is null or news_url ~* '^https?://[^[:space:]]+$');

drop policy if exists posts_update_own_or_admin on public.posts;
create policy posts_update_own_or_admin on public.posts for update to authenticated
using (exists (
  select 1 from public.profiles actor where actor.user_id = auth.uid()
    and coalesce(actor.account_status, 'active') = 'active'
    and (actor.id = posts.author_id or (lower(coalesce(actor.role, '')) = 'admin'
      and (coalesce(actor.is_superadmin, false) or actor.neighborhood_id = posts.neighborhood_id)))
))
with check (exists (
  select 1 from public.profiles actor where actor.user_id = auth.uid()
    and coalesce(actor.account_status, 'active') = 'active'
    and actor.neighborhood_id = posts.neighborhood_id
    and (actor.id = posts.author_id or (lower(coalesce(actor.role, '')) = 'admin'
      and (coalesce(actor.is_superadmin, false) or actor.neighborhood_id = posts.neighborhood_id)))
));

drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin on public.posts for delete to authenticated
using (exists (
  select 1 from public.profiles actor where actor.user_id = auth.uid()
    and coalesce(actor.account_status, 'active') = 'active'
    and (actor.id = posts.author_id or (lower(coalesce(actor.role, '')) = 'admin'
      and (coalesce(actor.is_superadmin, false) or actor.neighborhood_id = posts.neighborhood_id)))
));

grant update, delete on public.posts to authenticated;
