-- Eventos pagados: tarifas múltiples, por ejemplo Adultos y Niños.

alter table public.posts
  add column if not exists event_ticket_prices jsonb not null default '[]'::jsonb;

alter table public.posts
  drop constraint if exists posts_event_ticket_prices_array_check;

alter table public.posts
  add constraint posts_event_ticket_prices_array_check
  check (jsonb_typeof(event_ticket_prices) = 'array');
