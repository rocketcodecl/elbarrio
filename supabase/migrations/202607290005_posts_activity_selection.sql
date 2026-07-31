-- Permite que el panel elija qué eventos o noticias aparecen también
-- dentro de “Actividad de el barrio”. El valor por defecto evita mezclar
-- automáticamente todo el contenido editorial con el feed vecinal.

alter table public.posts
  add column if not exists show_in_activity boolean not null default false;

create index if not exists posts_activity_selection_idx
  on public.posts (neighborhood_id, type, status, created_at desc)
  where show_in_activity = true;

comment on column public.posts.show_in_activity is
  'Seleccionado desde administración para aparecer también en Actividad de el barrio.';
