-- Campos editoriales mínimos para administrar noticias desde el panel.

alter table public.posts
  add column if not exists news_is_official boolean not null default false;

alter table public.posts
  add column if not exists news_source text;

alter table public.posts
  add column if not exists show_in_activity boolean not null default false;

create index if not exists posts_news_feed_idx
  on public.posts (neighborhood_id, status, created_at desc)
  where type = 'news';

comment on column public.posts.news_is_official is
  'Distingue una noticia oficial de una comunicación informativa general.';

comment on column public.posts.news_source is
  'Nombre público de la institución o entidad que origina la noticia.';
