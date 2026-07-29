-- Separa la visibilidad de una farmacia de su condición temporal de turno.
-- Las farmacias visibles actuales se conservan inicialmente como de turno.

alter table public.farmacias
  add column if not exists is_on_duty boolean;

update public.farmacias
set is_on_duty = coalesce(is_active, false)
where is_on_duty is null;

alter table public.farmacias
  alter column is_on_duty set default false;

alter table public.farmacias
  alter column is_on_duty set not null;

create index if not exists farmacias_visibility_duty_order_idx
  on public.farmacias (is_active, is_on_duty, sort_order);

comment on column public.farmacias.is_on_duty is
  'Indica si la farmacia visible debe destacarse actualmente como farmacia de turno.';
