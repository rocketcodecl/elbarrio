-- Flujo persistente de propuesta, match y cierre para venta/regalo/trueque.

create table if not exists public.marketplace_deals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  matched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint marketplace_deals_participants_differ check (buyer_id <> seller_id),
  constraint marketplace_deals_status_check check (
    status in ('proposed', 'matched', 'completed', 'rejected', 'cancelled')
  ),
  constraint marketplace_deals_post_buyer_unique unique (post_id, buyer_id)
);

create index if not exists marketplace_deals_seller_status_idx
  on public.marketplace_deals (seller_id, status, updated_at desc);

create index if not exists marketplace_deals_buyer_status_idx
  on public.marketplace_deals (buyer_id, status, updated_at desc);

alter table public.marketplace_deals enable row level security;

drop policy if exists marketplace_deals_participants_read on public.marketplace_deals;
create policy marketplace_deals_participants_read
on public.marketplace_deals
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.user_id = auth.uid()
      and profile.id in (marketplace_deals.buyer_id, marketplace_deals.seller_id)
  )
);

create or replace function public.marketplace_propose_deal(p_post_id uuid)
returns public.marketplace_deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer public.profiles%rowtype;
  v_post public.posts%rowtype;
  v_deal public.marketplace_deals%rowtype;
begin
  select *
    into v_buyer
  from public.profiles
  where user_id = auth.uid()
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_buyer.id is null then
    raise exception 'No pudimos identificar tu perfil activo.' using errcode = '42501';
  end if;

  select *
    into v_post
  from public.posts
  where id = p_post_id
  for update;

  if v_post.id is null
     or v_post.type not in ('sell', 'gift', 'trade')
     or coalesce(v_post.status, 'active') <> 'active' then
    raise exception 'La publicación ya no está disponible.' using errcode = '22023';
  end if;

  if v_post.author_id is null or v_post.author_id = v_buyer.id then
    raise exception 'No puedes proponer un trato sobre tu propia publicación.' using errcode = '42501';
  end if;

  if v_post.neighborhood_id is distinct from v_buyer.neighborhood_id then
    raise exception 'Solo puedes coordinar con publicaciones de tu barrio.' using errcode = '42501';
  end if;

  select *
    into v_deal
  from public.marketplace_deals
  where post_id = p_post_id
    and buyer_id = v_buyer.id
  for update;

  if v_deal.id is not null and v_deal.status in ('proposed', 'matched', 'completed') then
    return v_deal;
  end if;

  if v_deal.id is not null then
    update public.marketplace_deals
    set status = 'proposed',
        seller_id = v_post.author_id,
        updated_at = now(),
        matched_at = null,
        completed_at = null,
        cancelled_at = null
    where id = v_deal.id
    returning * into v_deal;
    return v_deal;
  end if;

  insert into public.marketplace_deals (post_id, buyer_id, seller_id)
  values (p_post_id, v_buyer.id, v_post.author_id)
  returning * into v_deal;

  return v_deal;
end;
$$;

create or replace function public.marketplace_respond_deal(
  p_deal_id uuid,
  p_action text
)
returns public.marketplace_deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_deal public.marketplace_deals%rowtype;
  v_post public.posts%rowtype;
begin
  select id
    into v_actor_id
  from public.profiles
  where user_id = auth.uid()
    and coalesce(account_status, 'active') = 'active'
  limit 1;

  if v_actor_id is null then
    raise exception 'No pudimos identificar tu perfil activo.' using errcode = '42501';
  end if;

  select *
    into v_deal
  from public.marketplace_deals
  where id = p_deal_id
  for update;

  if v_deal.id is null or v_actor_id not in (v_deal.buyer_id, v_deal.seller_id) then
    raise exception 'No tienes acceso a este trato.' using errcode = '42501';
  end if;

  select *
    into v_post
  from public.posts
  where id = v_deal.post_id
  for update;

  case p_action
    when 'accept' then
      if v_actor_id <> v_deal.seller_id or v_deal.status <> 'proposed' then
        raise exception 'Esta propuesta ya no puede aceptarse.' using errcode = '22023';
      end if;
      update public.marketplace_deals
      set status = 'matched', matched_at = now(), updated_at = now(), cancelled_at = null
      where id = v_deal.id
      returning * into v_deal;

    when 'reject' then
      if v_actor_id <> v_deal.seller_id or v_deal.status <> 'proposed' then
        raise exception 'Esta propuesta ya no puede rechazarse.' using errcode = '22023';
      end if;
      update public.marketplace_deals
      set status = 'rejected', updated_at = now(), cancelled_at = now()
      where id = v_deal.id
      returning * into v_deal;

    when 'cancel' then
      if v_actor_id <> v_deal.buyer_id or v_deal.status not in ('proposed', 'matched') then
        raise exception 'Este trato ya no puede cancelarse.' using errcode = '22023';
      end if;
      update public.marketplace_deals
      set status = 'cancelled', updated_at = now(), cancelled_at = now()
      where id = v_deal.id
      returning * into v_deal;

    when 'complete' then
      if v_actor_id <> v_deal.seller_id or v_deal.status <> 'matched' then
        raise exception 'Solo el vendedor puede cerrar un trato aceptado.' using errcode = '42501';
      end if;
      if v_post.id is null or v_post.author_id <> v_deal.seller_id then
        raise exception 'La publicación asociada ya no está disponible.' using errcode = '22023';
      end if;

      update public.marketplace_deals
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_deal.id
      returning * into v_deal;

      update public.posts
      set status = 'sold'
      where id = v_deal.post_id;

      update public.marketplace_deals
      set status = 'cancelled', cancelled_at = now(), updated_at = now()
      where post_id = v_deal.post_id
        and id <> v_deal.id
        and status in ('proposed', 'matched');

    else
      raise exception 'Acción de trato no válida.' using errcode = '22023';
  end case;

  return v_deal;
end;
$$;

revoke all on function public.marketplace_propose_deal(uuid) from public;
revoke all on function public.marketplace_respond_deal(uuid, text) from public;
grant execute on function public.marketplace_propose_deal(uuid) to authenticated;
grant execute on function public.marketplace_respond_deal(uuid, text) to authenticated;

grant select on public.marketplace_deals to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketplace_deals'
  ) then
    alter publication supabase_realtime add table public.marketplace_deals;
  end if;
end;
$$;
