"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, ShoppingBasket, Trash2, Wallet, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { formatMoney, formatTime, SHIFT_LABEL } from "@/lib/format";
import { Button, Modal } from "@/components/ui";
import { ProductVisual } from "@/components/product-tile";
import { OpenSessionForm } from "@/components/open-session-form";
import { Checkout } from "./checkout";

type CartLine = { product: Product; quantity: number };

export function PosClient({
  products,
  categories,
  session,
}: {
  products: Product[];
  categories: Category[];
  session: { id: string; shift: string; opened_at: string } | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartSheet, setCartSheet] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const usedCategories = useMemo(
    () => categories.filter((c) => products.some((p) => p.category_id === c.id)),
    [categories, products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catOrder = new Map(categories.map((c, i) => [c.id, i]));
    const rank = (p: Product) => (p.category_id ? (catOrder.get(p.category_id) ?? 999) : 999);
    return [...products]
      .sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .filter(
      (p) =>
        (category === "all" || p.category_id === category) &&
        (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, categories, category, query]);

  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + Number(l.product.price) * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  function available(p: Product) {
    return p.track_stock ? p.stock - (cart[p.id]?.quantity ?? 0) : Infinity;
  }

  function add(p: Product) {
    if (available(p) <= 0) {
      setFlash(`Ya no hay stock de ${p.name}`);
      setTimeout(() => setFlash(null), 1800);
      return;
    }
    setCart((c) => ({ ...c, [p.id]: { product: p, quantity: (c[p.id]?.quantity ?? 0) + 1 } }));
  }

  function change(id: string, delta: number) {
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      const q = line.quantity + delta;
      if (delta > 0 && line.product.track_stock && q > line.product.stock) return c;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = { ...line, quantity: q };
      return next;
    });
  }

  function onSold() {
    setCart({});
    setCartSheet(false);
    router.refresh();
  }

  const cartPanel = (
    <CartPanel
      lines={lines}
      total={total}
      count={count}
      onChange={change}
      onClear={() => setCart({})}
      onCheckout={() => {
        setCartSheet(false);
        setCheckoutOpen(true);
      }}
      disabled={!session}
    />
  );

  return (
    <div className="md:flex md:h-dvh">
      {/* Productos */}
      <section className="flex-1 min-w-0 flex flex-col md:h-dvh">
        <header className="px-4 pt-4 pb-3 space-y-3 bg-cream-100/95 backdrop-blur sticky top-0 z-20 md:static">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-12 rounded-full md:hidden" />
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-cocoa-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto…"
                className="w-full h-12 rounded-full border-2 border-line bg-white pl-12 pr-10 font-semibold outline-none focus:border-corn-500"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-full hover:bg-cream-300"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
            {session && (
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white border-2 border-line px-3 h-12 text-sm font-bold text-cocoa-500 whitespace-nowrap">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                Caja {SHIFT_LABEL[session.shift]} · {formatTime(session.opened_at)}
              </div>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Todo
            </Chip>
            {usedCategories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </header>

        <div className="flex-1 md:overflow-y-auto px-4 pb-32 md:pb-6">
          {!session && (
            <div className="mb-4 rounded-3xl border-4 border-dashed border-corn-500 bg-butter-200/50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wallet className="size-8 text-cocoa-500" />
                <div>
                  <p className="font-display text-lg font-semibold">La caja está cerrada</p>
                  <p className="text-sm font-semibold text-cocoa-400">Ábrela para empezar a vender</p>
                </div>
              </div>
              <OpenSessionButton />
            </div>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-16 text-cocoa-300 font-semibold">
              {products.length === 0
                ? "Aún no tienes productos. Agrégalos en la sección Productos."
                : "No hay productos que coincidan."}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {visible.map((p) => {
                const inCart = cart[p.id]?.quantity ?? 0;
                const left = available(p);
                const out = p.track_stock && p.stock <= 0;
                const low = p.track_stock && !out && p.stock <= p.low_stock_alert;
                return (
                  <button
                    key={p.id}
                    onClick={() => add(p)}
                    disabled={out || !session}
                    className="relative aspect-[4/5] rounded-3xl border-[3px] border-cocoa-700 bg-white p-2 flex flex-col text-left shadow-[0_4px_0_0_#3a0803] active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a0803] transition disabled:opacity-50 disabled:active:translate-y-0"
                  >
                    <div
                      className="flex-1 rounded-2xl grid place-items-center overflow-hidden"
                      style={{ backgroundColor: `${p.color}33` }}
                    >
                      <ProductVisual product={p} className="size-full text-6xl lg:text-7xl" />
                    </div>
                    <div className="pt-2 px-1">
                      <p className="font-display font-semibold leading-tight line-clamp-2 text-[15px]">
                        {p.name}
                      </p>
                      <p className="font-display text-lg font-bold text-chili-600">
                        {formatMoney(p.price)}
                      </p>
                    </div>
                    {inCart > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-9 h-9 px-2 rounded-full bg-chili-600 text-white font-display text-lg font-bold grid place-items-center border-[3px] border-cocoa-700">
                        {inCart}
                      </span>
                    )}
                    {p.track_stock && (
                      <span
                        className={`absolute top-3 left-3 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                          out
                            ? "bg-cocoa-700 text-white"
                            : low
                              ? "bg-chili-500 text-white"
                              : "bg-white/85 text-cocoa-500"
                        }`}
                      >
                        {out ? "Agotado" : `${left} disp.`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Carrito: columna en iPad / escritorio */}
      <aside className="hidden md:flex w-[330px] lg:w-[380px] shrink-0 h-dvh border-l-4 border-cocoa-700 bg-cream-50 flex-col">
        {cartPanel}
      </aside>

      {/* Carrito: barra flotante en celular */}
      {count > 0 && (
        <div className="md:hidden fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20">
          <button
            onClick={() => setCartSheet(true)}
            className="w-full h-16 rounded-2xl bg-chili-600 text-white font-display text-lg font-semibold flex items-center justify-between px-5 border-[3px] border-cocoa-700 shadow-[0_4px_0_0_#3a0803]"
          >
            <span className="flex items-center gap-2">
              <ShoppingBasket className="size-6" /> {count} {count === 1 ? "artículo" : "artículos"}
            </span>
            <span>Cobrar {formatMoney(total)}</span>
          </button>
        </div>
      )}
      <Modal open={cartSheet} onClose={() => setCartSheet(false)} title="Pedido">
        <div className="-mx-5 -my-4 flex flex-col max-h-[75dvh]">{cartPanel}</div>
      </Modal>

      {flash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-cocoa-700 text-cream-100 px-5 py-3 font-bold shadow-xl">
          {flash}
        </div>
      )}

      <Checkout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={total}
        items={lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity }))}
        onSold={onSold}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-11 px-5 rounded-full font-display font-semibold border-[3px] transition ${
        active
          ? "bg-cocoa-700 border-cocoa-700 text-corn-400"
          : "bg-white border-line text-cocoa-500 hover:border-corn-400"
      }`}
    >
      {children}
    </button>
  );
}

function OpenSessionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button variant="dark" onClick={() => setOpen(true)}>
        Abrir caja
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Abrir caja" size="sm">
        <OpenSessionForm
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

function CartPanel({
  lines,
  total,
  count,
  onChange,
  onClear,
  onCheckout,
  disabled,
}: {
  lines: CartLine[];
  total: number;
  count: number;
  onChange: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-display text-2xl font-bold">Pedido</h2>
        {lines.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm font-bold text-chili-600 px-3 h-9 rounded-full hover:bg-chili-500/10"
          >
            <Trash2 className="size-4" /> Vaciar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {lines.length === 0 ? (
          <div className="h-full min-h-40 grid place-items-center text-center text-cocoa-300 font-semibold px-6">
            <div>
              <div className="text-5xl mb-2">🍿</div>
              Toca un producto para agregarlo
            </div>
          </div>
        ) : (
          <ul className="space-y-2 pb-3">
            {lines.map(({ product: p, quantity }) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white border-2 border-line p-2">
                <div
                  className="size-12 shrink-0 rounded-xl overflow-hidden grid place-items-center"
                  style={{ backgroundColor: `${p.color}33` }}
                >
                  <ProductVisual product={p} className="size-full text-2xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight truncate">{p.name}</p>
                  <p className="text-sm font-bold text-cocoa-400">
                    {formatMoney(Number(p.price) * quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onChange(p.id, -1)}
                    className="size-10 rounded-xl bg-cream-200 grid place-items-center active:bg-cream-400"
                    aria-label="Quitar uno"
                  >
                    <Minus className="size-5" />
                  </button>
                  <span className="w-8 text-center font-display text-lg font-bold">{quantity}</span>
                  <button
                    onClick={() => onChange(p.id, 1)}
                    className="size-10 rounded-xl bg-corn-400 grid place-items-center active:bg-corn-500"
                    aria-label="Agregar uno"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t-4 border-cocoa-700 bg-butter-200/60 p-4 space-y-3 safe-bottom">
        <div className="flex items-end justify-between">
          <span className="font-bold text-cocoa-500">
            Total{count > 0 && ` · ${count} art.`}
          </span>
          <span className="font-display text-4xl font-bold">{formatMoney(total)}</span>
        </div>
        <Button size="xl" className="w-full" disabled={lines.length === 0 || disabled} onClick={onCheckout}>
          Cobrar
        </Button>
      </div>
    </>
  );
}
