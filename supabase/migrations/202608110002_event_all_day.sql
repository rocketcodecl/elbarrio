-- Permite eventos definidos por fecha, sin exponer una hora inventada.
alter table public.posts
  add column if not exists event_all_day boolean not null default false;

comment on column public.posts.event_all_day is
  'True cuando el evento tiene fecha de inicio pero no una hora específica.';
