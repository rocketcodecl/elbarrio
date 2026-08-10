-- Acción externa opcional para eventos: información, entradas o sitio oficial.
alter table public.posts
  add column if not exists event_external_url text,
  add column if not exists event_external_label text;

alter table public.posts drop constraint if exists posts_event_external_url_http_check;
alter table public.posts add constraint posts_event_external_url_http_check
  check (event_external_url is null or event_external_url ~* '^https?://[^[:space:]]+$');

comment on column public.posts.event_external_url is
  'Enlace externo opcional del evento: sitio oficial, entradas o más información.';
comment on column public.posts.event_external_label is
  'Texto del CTA externo mostrado en el detalle del evento.';
