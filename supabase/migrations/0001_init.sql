-- =====================================================================
-- Pop Corn Mexa · Sistema de ventas
-- Esquema inicial: productos, inventario, ventas, cortes de caja,
-- seguridad (RLS) y funciones de negocio.
-- Ejecutar completo en Supabase → SQL Editor (o con `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.payment_method as enum ('efectivo', 'tarjeta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shift_type as enum ('manana', 'noche');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('abierta', 'cerrada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum ('completada', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cash_movement_type as enum ('entrada', 'salida');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  category_id     uuid references public.categories (id) on delete set null,
  price           numeric(10, 2) not null check (price >= 0),
  cost            numeric(10, 2) check (cost >= 0),
  track_stock     boolean not null default true,
  stock           integer not null default 0,
  low_stock_alert integer not null default 5,
  emoji           text not null default '🍿',
  color           text not null default '#f9bb3b',
  image_url       text,
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Caja (turnos mañana / noche)
-- ---------------------------------------------------------------------
create table if not exists public.cash_sessions (
  id            uuid primary key default gen_random_uuid(),
  shift         public.shift_type not null,
  status        public.session_status not null default 'abierta',
  opened_at     timestamptz not null default now(),
  opening_cash  numeric(10, 2) not null default 0 check (opening_cash >= 0),
  closed_at     timestamptz,
  -- Foto del corte al cerrar
  cash_sales    numeric(10, 2),
  card_sales    numeric(10, 2),
  total_sales   numeric(10, 2),
  sales_count   int,
  cash_in       numeric(10, 2),
  cash_out      numeric(10, 2),
  expected_cash numeric(10, 2),
  counted_cash  numeric(10, 2),
  difference    numeric(10, 2),
  denominations jsonb,
  notes         text
);

-- Sólo puede haber UNA caja abierta a la vez
create unique index if not exists cash_sessions_one_open
  on public.cash_sessions ((true)) where status = 'abierta';
create index if not exists cash_sessions_opened_idx on public.cash_sessions (opened_at desc);

create table if not exists public.cash_movements (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions (id) on delete cascade,
  type       public.cash_movement_type not null,
  amount     numeric(10, 2) not null check (amount > 0),
  reason     text not null,
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_session_idx on public.cash_movements (session_id);

-- ---------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  folio           bigint generated always as identity,
  session_id      uuid not null references public.cash_sessions (id),
  created_at      timestamptz not null default now(),
  total           numeric(10, 2) not null check (total >= 0),
  payment_method  public.payment_method not null,
  amount_received numeric(10, 2) not null,
  change_given    numeric(10, 2) not null default 0,
  status          public.sale_status not null default 'completada',
  cancelled_at    timestamptz,
  cancel_reason   text
);

create index if not exists sales_created_idx on public.sales (created_at desc);
create index if not exists sales_session_idx on public.sales (session_id);

create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  category_id  uuid references public.categories (id) on delete set null,
  unit_price   numeric(10, 2) not null,
  quantity     int not null check (quantity > 0),
  subtotal     numeric(10, 2) not null
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_idx on public.sale_items (product_id);

-- ---------------------------------------------------------------------
-- Movimientos de inventario (bitácora)
-- ---------------------------------------------------------------------
create table if not exists public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   int not null,
  reason     text not null check (reason in ('venta', 'reabasto', 'ajuste', 'cancelacion', 'merma')),
  note       text,
  sale_id    uuid references public.sales (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Seguridad
-- La app NO usa login: todo el acceso pasa por el servidor de Next.js con
-- la llave service_role (secreta). Se activa RLS sin políticas para que la
-- llave pública (anon) no pueda leer ni escribir nada.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'products', 'cash_sessions', 'cash_movements',
                           'sales', 'sale_items', 'stock_movements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Funciones de negocio
-- ---------------------------------------------------------------------

-- Caja abierta actual (o null)
create or replace function public.current_session_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select id from public.cash_sessions where status = 'abierta' limit 1;
$$;

-- Registrar una venta de forma atómica.
-- p_items: [{ "product_id": "...", "quantity": 2 }, ...]
create or replace function public.create_sale(
  p_items           jsonb,
  p_payment_method  public.payment_method,
  p_amount_received numeric default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_session  uuid;
  v_sale_id  uuid;
  v_folio    bigint;
  v_total    numeric(10, 2) := 0;
  v_received numeric(10, 2);
  v_change   numeric(10, 2) := 0;
  v_item     jsonb;
  v_qty      int;
  v_product  public.products%rowtype;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  select id into v_session from public.cash_sessions where status = 'abierta' for update;
  if v_session is null then
    raise exception 'No hay caja abierta. Abre la caja para poder vender.';
  end if;

  -- Validar y calcular total con precios de la BD (nunca del cliente)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found or not v_product.active then
      raise exception 'Producto no disponible';
    end if;

    if v_product.track_stock and v_product.stock < v_qty then
      raise exception 'Stock insuficiente de "%" (quedan %)', v_product.name, v_product.stock;
    end if;

    v_total := v_total + v_product.price * v_qty;
  end loop;

  if p_payment_method = 'efectivo' then
    v_received := coalesce(p_amount_received, v_total);
    if v_received < v_total then
      raise exception 'El monto recibido ($%) es menor al total ($%)', v_received, v_total;
    end if;
    v_change := v_received - v_total;
  else
    v_received := v_total;
    v_change := 0;
  end if;

  insert into public.sales (session_id, total, payment_method, amount_received, change_given)
  values (v_session, v_total, p_payment_method, v_received, v_change)
  returning id, folio into v_sale_id, v_folio;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;

    insert into public.sale_items (sale_id, product_id, product_name, category_id, unit_price, quantity, subtotal)
    values (v_sale_id, v_product.id, v_product.name, v_product.category_id, v_product.price, v_qty, v_product.price * v_qty);

    if v_product.track_stock then
      update public.products set stock = stock - v_qty where id = v_product.id;
      insert into public.stock_movements (product_id, quantity, reason, sale_id)
      values (v_product.id, -v_qty, 'venta', v_sale_id);
    end if;
  end loop;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'folio', v_folio,
    'total', v_total,
    'amount_received', v_received,
    'change', v_change,
    'payment_method', p_payment_method
  );
end;
$$;

-- Cancelar una venta (sólo si su caja sigue abierta). Regresa el stock.
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item public.sale_items%rowtype;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status = 'cancelada' then raise exception 'La venta ya estaba cancelada'; end if;

  if not exists (select 1 from public.cash_sessions where id = v_sale.session_id and status = 'abierta') then
    raise exception 'No se puede cancelar: el corte de esa caja ya se hizo';
  end if;

  update public.sales
     set status = 'cancelada', cancelled_at = now(), cancel_reason = p_reason
   where id = p_sale_id;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    if v_item.product_id is not null and exists (
      select 1 from public.products where id = v_item.product_id and track_stock
    ) then
      update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
      insert into public.stock_movements (product_id, quantity, reason, sale_id, note)
      values (v_item.product_id, v_item.quantity, 'cancelacion', p_sale_id, p_reason);
    end if;
  end loop;
end;
$$;

-- Ajustar inventario (reabasto, merma o ajuste manual)
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_delta      int,
  p_reason     text,
  p_note       text default null
)
returns int
language plpgsql
set search_path = public
as $$
declare v_new int;
begin
  if p_delta = 0 then raise exception 'La cantidad no puede ser 0'; end if;
  if p_reason not in ('reabasto', 'ajuste', 'merma') then raise exception 'Motivo inválido'; end if;

  update public.products set stock = stock + p_delta
   where id = p_product_id
  returning stock into v_new;

  if v_new is null then raise exception 'Producto no encontrado'; end if;
  if v_new < 0 then raise exception 'El inventario no puede quedar negativo'; end if;

  insert into public.stock_movements (product_id, quantity, reason, note)
  values (p_product_id, p_delta, p_reason, p_note);

  return v_new;
end;
$$;

-- Abrir caja
create or replace function public.open_cash_session(p_shift public.shift_type, p_opening_cash numeric)
returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid;
begin
  if exists (select 1 from public.cash_sessions where status = 'abierta') then
    raise exception 'Ya hay una caja abierta. Haz el corte antes de abrir otra.';
  end if;
  insert into public.cash_sessions (shift, opening_cash)
  values (p_shift, coalesce(p_opening_cash, 0))
  returning id into v_id;
  return v_id;
end;
$$;

-- Resumen de una caja (en vivo o cerrada)
create or replace function public.session_summary(p_session_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_s        public.cash_sessions%rowtype;
  v_cash     numeric(10, 2);
  v_card     numeric(10, 2);
  v_count    int;
  v_cancel   int;
  v_in       numeric(10, 2);
  v_out      numeric(10, 2);
  v_products jsonb;
begin
  select * into v_s from public.cash_sessions where id = p_session_id;
  if not found then raise exception 'Caja no encontrada'; end if;

  select coalesce(sum(total) filter (where payment_method = 'efectivo'), 0),
         coalesce(sum(total) filter (where payment_method = 'tarjeta'), 0),
         count(*)
    into v_cash, v_card, v_count
    from public.sales
   where session_id = p_session_id and status = 'completada';

  select count(*) into v_cancel
    from public.sales where session_id = p_session_id and status = 'cancelada';

  select coalesce(sum(amount) filter (where type = 'entrada'), 0),
         coalesce(sum(amount) filter (where type = 'salida'), 0)
    into v_in, v_out
    from public.cash_movements where session_id = p_session_id;

  select coalesce(jsonb_agg(p order by p.total desc), '[]'::jsonb) into v_products
    from (
      select si.product_name as name, sum(si.quantity)::int as quantity, sum(si.subtotal) as total
        from public.sale_items si
        join public.sales s on s.id = si.sale_id
       where s.session_id = p_session_id and s.status = 'completada'
       group by si.product_name
    ) p;

  return jsonb_build_object(
    'session_id',      v_s.id,
    'shift',           v_s.shift,
    'status',          v_s.status,
    'opened_at',       v_s.opened_at,
    'closed_at',       v_s.closed_at,
    'opening_cash',    v_s.opening_cash,
    'cash_sales',      v_cash,
    'card_sales',      v_card,
    'total_sales',     v_cash + v_card,
    'sales_count',     v_count,
    'cancelled_count', v_cancel,
    'cash_in',         v_in,
    'cash_out',        v_out,
    'expected_cash',   v_s.opening_cash + v_cash + v_in - v_out,
    'counted_cash',    v_s.counted_cash,
    'difference',      v_s.difference,
    'notes',           v_s.notes,
    'products',        v_products
  );
end;
$$;

-- Corte de caja: guarda la foto y cierra
create or replace function public.close_cash_session(
  p_session_id    uuid,
  p_counted_cash  numeric,
  p_denominations jsonb default null,
  p_notes         text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare v_sum jsonb;
begin
  perform 1 from public.cash_sessions where id = p_session_id and status = 'abierta' for update;
  if not found then raise exception 'Esa caja no está abierta'; end if;

  v_sum := public.session_summary(p_session_id);

  update public.cash_sessions set
    status        = 'cerrada',
    closed_at     = now(),
    cash_sales    = (v_sum ->> 'cash_sales')::numeric,
    card_sales    = (v_sum ->> 'card_sales')::numeric,
    total_sales   = (v_sum ->> 'total_sales')::numeric,
    sales_count   = (v_sum ->> 'sales_count')::int,
    cash_in       = (v_sum ->> 'cash_in')::numeric,
    cash_out      = (v_sum ->> 'cash_out')::numeric,
    expected_cash = (v_sum ->> 'expected_cash')::numeric,
    counted_cash  = p_counted_cash,
    difference    = p_counted_cash - (v_sum ->> 'expected_cash')::numeric,
    denominations = p_denominations,
    notes         = p_notes
  where id = p_session_id;

  return public.session_summary(p_session_id);
end;
$$;

-- Estadísticas para el dashboard
-- p_view: 'day' | 'week' | 'month';  p_date: cualquier día dentro del periodo (hora local)
create or replace function public.dashboard_stats(
  p_view text,
  p_date date,
  p_tz   text default 'America/Mexico_City'
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_start_l  timestamp;
  v_end_l    timestamp;
  v_prev_l   timestamp;
  v_start    timestamptz;
  v_end      timestamptz;
  v_prev     timestamptz;
  v_step     interval;
  v_unit     text;
  v_summary  jsonb;
  v_previous jsonb;
  v_series   jsonb;
  v_top      jsonb;
  v_cats     jsonb;
begin
  if p_view = 'day' then
    v_start_l := p_date::timestamp;
    v_end_l   := v_start_l + interval '1 day';
    v_prev_l  := v_start_l - interval '1 day';
    v_step    := interval '1 hour';
    v_unit    := 'hour';
  elsif p_view = 'week' then
    v_start_l := date_trunc('week', p_date::timestamp);  -- lunes
    v_end_l   := v_start_l + interval '7 days';
    v_prev_l  := v_start_l - interval '7 days';
    v_step    := interval '1 day';
    v_unit    := 'day';
  elsif p_view = 'month' then
    v_start_l := date_trunc('month', p_date::timestamp);
    v_end_l   := v_start_l + interval '1 month';
    v_prev_l  := v_start_l - interval '1 month';
    v_step    := interval '1 day';
    v_unit    := 'day';
  else
    raise exception 'Vista inválida';
  end if;

  v_start := v_start_l at time zone p_tz;
  v_end   := v_end_l   at time zone p_tz;
  v_prev  := v_prev_l  at time zone p_tz;

  select jsonb_build_object(
           'total',     coalesce(sum(total), 0),
           'count',     count(*),
           'avg',       coalesce(round(avg(total), 2), 0),
           'cash',      coalesce(sum(total) filter (where payment_method = 'efectivo'), 0),
           'card',      coalesce(sum(total) filter (where payment_method = 'tarjeta'), 0),
           'cash_count', count(*) filter (where payment_method = 'efectivo'),
           'card_count', count(*) filter (where payment_method = 'tarjeta'),
           'items',     coalesce((
              select sum(si.quantity) from public.sale_items si
                join public.sales s2 on s2.id = si.sale_id
               where s2.status = 'completada' and s2.created_at >= v_start and s2.created_at < v_end
           ), 0)
         )
    into v_summary
    from public.sales
   where status = 'completada' and created_at >= v_start and created_at < v_end;

  select jsonb_build_object(
           'total', coalesce(sum(total), 0),
           'count', count(*),
           'avg',   coalesce(round(avg(total), 2), 0)
         )
    into v_previous
    from public.sales
   where status = 'completada' and created_at >= v_prev and created_at < v_start;

  select coalesce(jsonb_agg(jsonb_build_object(
           'bucket', to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS'),
           'total',  b.total,
           'cash',   b.cash,
           'card',   b.card,
           'count',  b.cnt
         ) order by b.bucket), '[]'::jsonb)
    into v_series
    from (
      select gs as bucket,
             coalesce(sum(s.total), 0) as total,
             coalesce(sum(s.total) filter (where s.payment_method = 'efectivo'), 0) as cash,
             coalesce(sum(s.total) filter (where s.payment_method = 'tarjeta'), 0) as card,
             count(s.id) as cnt
        from generate_series(v_start_l, v_end_l - v_step, v_step) gs
        left join public.sales s
          on s.status = 'completada'
         and s.created_at >= v_start and s.created_at < v_end
         and date_trunc(v_unit, s.created_at at time zone p_tz) = gs
       group by gs
    ) b;

  select coalesce(jsonb_agg(t order by t.total desc), '[]'::jsonb)
    into v_top
    from (
      select si.product_name as name, sum(si.quantity)::int as quantity, sum(si.subtotal) as total
        from public.sale_items si
        join public.sales s on s.id = si.sale_id
       where s.status = 'completada' and s.created_at >= v_start and s.created_at < v_end
       group by si.product_name
       order by sum(si.subtotal) desc
       limit 10
    ) t;

  select coalesce(jsonb_agg(c order by c.total desc), '[]'::jsonb)
    into v_cats
    from (
      select coalesce(cat.name, 'Sin categoría') as name,
             sum(si.quantity)::int as quantity,
             sum(si.subtotal) as total
        from public.sale_items si
        join public.sales s on s.id = si.sale_id
        left join public.categories cat on cat.id = si.category_id
       where s.status = 'completada' and s.created_at >= v_start and s.created_at < v_end
       group by coalesce(cat.name, 'Sin categoría')
    ) c;

  return jsonb_build_object(
    'view',       p_view,
    'start',      to_char(v_start_l, 'YYYY-MM-DD'),
    'end',        to_char(v_end_l - interval '1 day', 'YYYY-MM-DD'),
    'summary',    v_summary,
    'previous',   v_previous,
    'series',     v_series,
    'top',        v_top,
    'categories', v_cats
  );
end;
$$;

-- Permisos para el servidor (service_role)
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Permisos de ejecución: sólo el servidor (service_role)
revoke all on function public.current_session_id() from public, anon, authenticated;
revoke all on function public.create_sale(jsonb, public.payment_method, numeric) from public, anon, authenticated;
revoke all on function public.cancel_sale(uuid, text) from public, anon, authenticated;
revoke all on function public.adjust_stock(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.open_cash_session(public.shift_type, numeric) from public, anon, authenticated;
revoke all on function public.session_summary(uuid) from public, anon, authenticated;
revoke all on function public.close_cash_session(uuid, numeric, jsonb, text) from public, anon, authenticated;
revoke all on function public.dashboard_stats(text, date, text) from public, anon, authenticated;
grant execute on function public.current_session_id() to service_role;
grant execute on function public.create_sale(jsonb, public.payment_method, numeric) to service_role;
grant execute on function public.cancel_sale(uuid, text) to service_role;
grant execute on function public.adjust_stock(uuid, int, text, text) to service_role;
grant execute on function public.open_cash_session(public.shift_type, numeric) to service_role;
grant execute on function public.session_summary(uuid) to service_role;
grant execute on function public.close_cash_session(uuid, numeric, jsonb, text) to service_role;
grant execute on function public.dashboard_stats(text, date, text) to service_role;

-- ---------------------------------------------------------------------
-- Storage: imágenes de productos (lectura pública; se suben desde el servidor)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
