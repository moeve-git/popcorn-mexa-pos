"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus, PackagePlus, Tags, Trash2 } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Alert, Button, Card, Field, inputClass, Modal, PageHeader } from "@/components/ui";
import { ProductVisual } from "@/components/product-tile";
import { adjustStock, deleteCategory, saveCategory } from "./actions";
import { ProductForm } from "./product-form";

type Filter = "all" | "low" | "inactive" | string;

export function ProductsClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);

  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const isLow = (p: Product) => p.track_stock && p.stock <= p.low_stock_alert;

  const lowCount = products.filter((p) => p.active && isLow(p)).length;
  const inventoryValue = products
    .filter((p) => p.active && p.track_stock)
    .reduce((s, p) => s + p.stock * Number(p.cost ?? 0), 0);

  const list = products.filter((p) => {
    if (filter === "all") return p.active;
    if (filter === "low") return p.active && isLow(p);
    if (filter === "inactive") return !p.active;
    return p.active && p.category_id === filter;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader
        title="Productos"
        subtitle="Palomitas, frituras, bebidas y todo lo que vendes"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCatsOpen(true)}>
              <Tags className="size-5" /> Categorías
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-5" /> Nuevo producto
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Productos activos" value={String(products.filter((p) => p.active).length)} />
        <Stat
          label="Stock bajo"
          value={String(lowCount)}
          tone={lowCount > 0 ? "warn" : undefined}
          onClick={() => setFilter("low")}
        />
        <Stat label="Valor inventario (costo)" value={formatMoney(inventoryValue)} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Todos
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.name}
          </FilterChip>
        ))}
        <FilterChip active={filter === "low"} onClick={() => setFilter("low")}>
          ⚠️ Stock bajo
        </FilterChip>
        <FilterChip active={filter === "inactive"} onClick={() => setFilter("inactive")}>
          Inactivos
        </FilterChip>
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-cocoa-300 font-semibold">
          {products.length === 0 ? "Agrega tu primer producto 🍿" : "Nada por aquí"}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((p) => {
            const margin = p.cost != null && Number(p.price) > 0 ? (Number(p.price) - Number(p.cost)) / Number(p.price) : null;
            return (
              <Card key={p.id} className="p-3 flex gap-3">
                <div
                  className="size-20 shrink-0 rounded-2xl overflow-hidden grid place-items-center border-2 border-cocoa-700"
                  style={{ backgroundColor: `${p.color}33` }}
                >
                  <ProductVisual product={p} className="size-full text-4xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold leading-tight truncate">{p.name}</p>
                      <p className="text-xs font-bold text-cocoa-300">
                        {p.category_id ? catName[p.category_id] : "Sin categoría"}
                      </p>
                    </div>
                    <p className="font-display text-lg font-bold text-chili-600 shrink-0">{formatMoney(p.price)}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-cocoa-400">
                    {p.track_stock ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                          p.stock <= 0
                            ? "bg-cocoa-700 text-white"
                            : isLow(p)
                              ? "bg-chili-500/15 text-chili-700"
                              : "bg-cream-200 text-cocoa-500"
                        }`}
                      >
                        {isLow(p) && <AlertTriangle className="size-3.5" />}
                        {p.stock} en stock
                      </span>
                    ) : null}
                    {p.track_stock && p.allow_oversell ? (
                      <span className="rounded-full px-2 py-0.5 bg-butter-200 text-cocoa-500">Se vende sin stock</span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 bg-cream-200">Sin control de stock</span>
                    )}
                    {margin !== null && <span>Margen {Math.round(margin * 100)}%</span>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {p.track_stock && (
                      <Button size="sm" variant="corn" onClick={() => setStockFor(p)}>
                        <PackagePlus className="size-4" /> Stock
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo producto" : "Editar producto"}
        size="lg"
      >
        {editing !== null && (
          <ProductForm
            key={editing === "new" ? "new" : editing.id}
            product={editing === "new" ? null : editing}
            categories={categories}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={stockFor !== null} onClose={() => setStockFor(null)} title="Inventario" size="sm">
        {stockFor && <StockForm key={stockFor.id} product={stockFor} onDone={() => setStockFor(null)} />}
      </Modal>

      <Modal open={catsOpen} onClose={() => setCatsOpen(false)} title="Categorías" size="sm">
        <CategoriesManager categories={categories} />
      </Modal>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "warn";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rounded-3xl border-2 p-3 md:p-4 ${
        tone === "warn" ? "bg-chili-500/10 border-chili-500/40" : "bg-white border-line"
      }`}
    >
      <p className="text-xs md:text-sm font-bold text-cocoa-400 leading-tight">{label}</p>
      <p className="font-display text-xl md:text-3xl font-bold mt-1 truncate">{value}</p>
    </button>
  );
}

function FilterChip({
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
      className={`shrink-0 h-10 px-4 rounded-full font-display font-semibold border-2 ${
        active ? "bg-cocoa-700 border-cocoa-700 text-corn-400" : "bg-white border-line text-cocoa-500"
      }`}
    >
      {children}
    </button>
  );
}

function StockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"reabasto" | "merma" | "ajuste">("reabasto");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const n = Math.floor(Number(qty || 0));
  const delta = mode === "reabasto" ? n : mode === "merma" ? -n : n - product.stock;
  const result = product.stock + delta;

  function submit() {
    setError(null);
    start(async () => {
      const res = await adjustStock(product.id, delta, mode, note);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="size-14 rounded-2xl overflow-hidden grid place-items-center"
          style={{ backgroundColor: `${product.color}33` }}
        >
          <ProductVisual product={product} className="size-full text-3xl" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{product.name}</p>
          <p className="font-bold text-cocoa-400">Stock actual: {product.stock}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["reabasto", "Entrada"],
            ["merma", "Merma"],
            ["ajuste", "Conteo"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`h-12 rounded-2xl border-[3px] font-display font-semibold ${
              mode === v ? "border-cocoa-700 bg-corn-400" : "border-line bg-white text-cocoa-400"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <Field
        label={
          mode === "reabasto"
            ? "¿Cuántas piezas llegaron?"
            : mode === "merma"
              ? "¿Cuántas se perdieron / dañaron?"
              : "¿Cuántas hay en físico?"
        }
      >
        <input
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
          className={`${inputClass} text-2xl h-14`}
          autoFocus
        />
      </Field>
      <Field label="Nota (opcional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </Field>
      <p className="font-bold text-cocoa-500">
        Quedará en: <span className={result < 0 ? "text-chili-600" : ""}>{result}</span>
      </p>
      {error && <Alert>{error}</Alert>}
      <Button size="lg" className="w-full" disabled={pending || delta === 0 || result < 0} onClick={submit}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}

function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const res = await saveCategory(null, name, categories.length + 1);
      if (!res.ok) return setError(res.error);
      setName("");
      router.refresh();
    });
  }

  function remove(c: Category) {
    if (!confirm(`¿Borrar la categoría "${c.name}"? Los productos quedarán sin categoría.`)) return;
    start(async () => {
      const res = await deleteCategory(c.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function rename(c: Category) {
    const n = prompt("Nuevo nombre", c.name);
    if (!n || n === c.name) return;
    start(async () => {
      const res = await saveCategory(c.id, n, c.sort_order);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          className={inputClass}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && add()}
        />
        <Button onClick={add} disabled={pending || !name.trim()}>
          <Plus className="size-5" />
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-2xl bg-white border-2 border-line pl-4 pr-1 h-12">
            <span className="flex-1 font-bold">{c.name}</span>
            <button onClick={() => rename(c)} className="size-10 grid place-items-center rounded-xl hover:bg-cream-200" aria-label="Renombrar">
              <Pencil className="size-4" />
            </button>
            <button onClick={() => remove(c)} className="size-10 grid place-items-center rounded-xl hover:bg-chili-500/10 text-chili-600" aria-label="Borrar">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="text-cocoa-300 font-semibold">Sin categorías aún</li>}
      </ul>
    </div>
  );
}
