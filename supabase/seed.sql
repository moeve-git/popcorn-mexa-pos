-- Datos de ejemplo (opcional). Puedes borrarlos o editarlos desde la app.
insert into public.categories (name, sort_order) values
  ('Palomitas', 1),
  ('Frituras', 2),
  ('Bebidas', 3),
  ('Dulces', 4)
on conflict (name) do nothing;

insert into public.products (name, category_id, price, cost, stock, emoji, color, sort_order)
select p.name, c.id, p.price, p.cost, p.stock, p.emoji, p.color, p.sort_order
from (values
  ('Palomitas chicas',      'Palomitas', 30, 8,  100, '🍿', '#f9bb3b', 1),
  ('Palomitas medianas',    'Palomitas', 45, 12, 100, '🍿', '#f9bb3b', 2),
  ('Palomitas grandes',     'Palomitas', 60, 16, 100, '🍿', '#f9bb3b', 3),
  ('Palomitas con chile',   'Palomitas', 50, 14, 100, '🌶️', '#f33031', 4),
  ('Palomitas caramelo',    'Palomitas', 55, 15, 100, '🍯', '#eb921a', 5),
  ('Papas preparadas',      'Frituras',  40, 15, 40,  '🥔', '#fbd651', 1),
  ('Chicharrones',          'Frituras',  35, 12, 40,  '🥓', '#eb921a', 2),
  ('Doritos preparados',    'Frituras',  45, 18, 30,  '🔺', '#f33031', 3),
  ('Refresco',              'Bebidas',   25, 12, 48,  '🥤', '#fb7a86', 1),
  ('Agua',                  'Bebidas',   15, 6,  48,  '💧', '#b779cf', 2),
  ('Gomitas',               'Dulces',    20, 8,  60,  '🍬', '#fb7a86', 1),
  ('Paleta enchilada',      'Dulces',    10, 4,  80,  '🍭', '#e73967', 2)
) as p(name, category, price, cost, stock, emoji, color, sort_order)
join public.categories c on c.name = p.category
where not exists (select 1 from public.products);

-- Las palomitas se pueden vender aunque no haya stock (requiere 0002_allow_oversell.sql)
update public.products p set allow_oversell = true
from public.categories c
where c.id = p.category_id and c.name = 'Palomitas';
