-- =====================================================================
-- Favoritos: productos que aparecen en la pestaña ⭐ Favoritos al vender.
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================

alter table public.products
  add column if not exists is_favorite boolean not null default false;

create index if not exists products_favorite_idx on public.products (is_favorite) where is_favorite;
