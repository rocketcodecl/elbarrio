-- El administrador decide si el detalle del evento muestra la cantidad y los perfiles confirmados.

alter table public.posts
  add column if not exists event_show_attendees boolean not null default true;
