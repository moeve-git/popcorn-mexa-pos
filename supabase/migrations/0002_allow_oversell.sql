-- =====================================================================
-- Permitir vender productos aunque no haya stock (ej. palomitas).
-- El stock puede quedar en negativo; al reabastecer se compensa.
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================

alter table public.products
  add column if not exists allow_oversell boolean not null default false;

-- Las palomitas se venden aunque el stock llegue a 0
update public.products p
   set allow_oversell = true
  from public.categories c
 where c.id = p.category_id
   and c.name ilike 'palomitas%';

-- create_sale: sólo bloquea si el producto NO permite vender sin stock
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

    if v_product.track_stock and not v_product.allow_oversell and v_product.stock < v_qty then
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

-- adjust_stock: permite reabastecer aunque el stock esté en negativo
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
declare
  v_new  int;
  v_over boolean;
begin
  if p_delta = 0 then raise exception 'La cantidad no puede ser 0'; end if;
  if p_reason not in ('reabasto', 'ajuste', 'merma') then raise exception 'Motivo inválido'; end if;

  update public.products set stock = stock + p_delta
   where id = p_product_id
  returning stock, allow_oversell into v_new, v_over;

  if v_new is null then raise exception 'Producto no encontrado'; end if;
  if v_new < 0 and not v_over and p_delta < 0 then
    raise exception 'El inventario no puede quedar negativo';
  end if;

  insert into public.stock_movements (product_id, quantity, reason, note)
  values (p_product_id, p_delta, p_reason, p_note);

  return v_new;
end;
$$;

revoke all on function public.create_sale(jsonb, public.payment_method, numeric) from public, anon, authenticated;
revoke all on function public.adjust_stock(uuid, int, text, text) from public, anon, authenticated;
grant execute on function public.create_sale(jsonb, public.payment_method, numeric) to service_role;
grant execute on function public.adjust_stock(uuid, int, text, text) to service_role;

-- ---------------------------------------------------------------------
-- Permisos explícitos para el servidor (service_role).
-- Algunos proyectos nuevos de Supabase no los otorgan automáticamente,
-- lo que provoca "permission denied for table ...".
-- ---------------------------------------------------------------------
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
