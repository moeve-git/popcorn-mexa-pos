# 🍿 Pop Corn Mexa · Sistema de ventas

Punto de venta para Pop Corn Mexa, pensado para usarse en **iPad**. También funciona en celular y en computadora.

- **Vender:** tocas el ícono del producto y cobras con **efectivo** (escribes cuánto te dieron y te dice el cambio) o con **tarjeta** (sólo queda registrado el método).
- **Productos e inventario:** puedes agregar productos con precio, costo, stock, categoría, emoji o foto y color. También registras entradas de mercancía, mermas y conteos físicos. La app te avisa cuando el stock está bajo.
- **Caja:** abres el turno de **mañana** o **noche** con un fondo inicial. Puedes registrar entradas y salidas de efectivo (hielo, gas, etc.). En el **corte** cuentas los billetes y la app te dice si la caja cuadra, si sobra o si falta.
- **Ventas:** historial por día. Puedes cancelar un ticket mientras la caja de ese turno siga abierta; al cancelarlo, el stock se regresa.
- **Reportes:** ventas por día, semana o mes. Incluye la comparación contra el periodo anterior, efectivo contra tarjeta, ventas por categoría y los productos más vendidos.

**Tecnología:** Next.js 16 (App Router y Server Actions) y Supabase (Postgres). Se despliega en Vercel.

---

## 1. Crear la base de datos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Entra a **SQL Editor** y ejecuta, en orden, el contenido de cada archivo de [`supabase/migrations/`](supabase/migrations/) (`0001_init.sql` y después `0002_allow_oversell.sql`) con **Run**.
3. (Opcional) Si quieres productos de ejemplo, pega y ejecuta [`supabase/seed.sql`](supabase/seed.sql).

## 2. Variables de entorno

En Supabase ve a **Project Settings → API** y copia estos valores:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | El "Project URL" |
| `SUPABASE_SERVICE_ROLE_KEY` | La llave **service_role** (secreta) |
| `APP_PIN` | *(opcional)* Si la defines, la app pide este PIN una vez por dispositivo |

> ⚠️ La llave `service_role` sólo se guarda en Vercel o en tu `.env.local`. No la compartas ni la pegues en chats.

## 3. Desplegar en Vercel

1. Sube este repo a GitHub.
2. En [vercel.com](https://vercel.com) ve a **Add New → Project** y selecciona el repo.
3. En **Environment Variables** agrega las variables de la tabla anterior.
4. Presiona **Deploy**.

### Instalarla en el iPad como app

Abre la URL en **Safari**, toca **Compartir** y luego **Agregar a pantalla de inicio**. Se abrirá en pantalla completa con el logo de Pop Corn Mexa.

## Desarrollo local

```bash
cp .env.example .env.local   # y llena los valores
npm install
npm run dev
```

## Seguridad (sin login)

La app no tiene usuario ni contraseña. Para que siga siendo segura:

- La base de datos **sólo se consulta desde el servidor** de Next.js con la llave `service_role`. Esa llave nunca llega al navegador.
- Todas las tablas tienen RLS activado y no tienen políticas. Así, la llave pública (`anon`) de Supabase no puede leer ni modificar nada.
- Cualquier persona que tenga la URL puede usar la app. Si quieres evitarlo, define `APP_PIN` en Vercel: se pedirá una sola vez en cada dispositivo y se recordará durante un año.

## Estructura

```
supabase/migrations/0001_init.sql   Tablas, seguridad y funciones (ventas, cortes, reportes)
src/app/(app)/venta                 Punto de venta y cobro
src/app/(app)/productos             Productos, categorías e inventario
src/app/(app)/caja                  Apertura, movimientos y corte de caja
src/app/(app)/ventas                Historial y cancelaciones
src/app/(app)/dashboard             Reportes diarios, semanales y mensuales
src/proxy.ts                        PIN opcional
```

Las operaciones de dinero e inventario (registrar una venta, cancelarla, ajustar stock, hacer el corte) se ejecutan dentro de Postgres en una sola transacción. Los precios se toman de la base de datos y no del navegador.
