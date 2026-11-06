"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { ProductVisual } from "@/components/product-tile";
import { deleteProduct, saveProduct, uploadProductImage, type ProductInput } from "./actions";

const EMOJIS = [
  "🍿", "🌶️", "🍯", "🧈", "🧀", "🍫", "🍓", "🥔", "🥓", "🌽", "🔺", "🥨", "🥜", "🍟",
  "🌭", "🍕", "🥤", "🧃", "💧", "🧋", "☕", "🍺", "🍬", "🍭", "🍩", "🍪", "🍦", "🍋",
  "🥭", "🍉", "🍎", "🧂", "🎉", "⭐",
];

const COLORS = ["#f9bb3b", "#fbd651", "#eb921a", "#f33031", "#fb7a86", "#e73967", "#b779cf", "#874b1f", "#fad49e", "#7cc97a", "#5ab4e6"];

export function ProductForm({
  product,
  categories,
  onDone,
}: {
  product: Product | null;
  categories: Category[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductInput>(() => ({
    name: product?.name ?? "",
    category_id: product?.category_id ?? categories[0]?.id ?? null,
    price: Number(product?.price ?? 0),
    cost: product?.cost != null ? Number(product.cost) : null,
    track_stock: product?.track_stock ?? true,
    allow_oversell: product?.allow_oversell ?? false,
    stock: product?.stock ?? 0,
    low_stock_alert: product?.low_stock_alert ?? 5,
    emoji: product?.emoji ?? "🍿",
    color: product?.color ?? "#f9bb3b",
    image_url: product?.image_url ?? null,
    active: product?.active ?? true,
    is_favorite: product?.is_favorite ?? false,
    sort_order: product?.sort_order ?? 0,
  }));
  const [priceText, setPriceText] = useState(product ? String(product.price) : "");
  const [costText, setCostText] = useState(product?.cost != null ? String(product.cost) : "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await resizeImage(file, 600);
      const fd = new FormData();
      fd.append("file", blob, "producto.jpg");
      const res = await uploadProductImage(fd);
      if (!res.ok) throw new Error(res.error);
      set("image_url", res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    const payload: ProductInput = {
      ...form,
      price: Number(priceText || 0),
      cost: costText === "" ? null : Number(costText),
    };
    start(async () => {
      const res = await saveProduct(product?.id ?? null, payload);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  function remove() {
    if (!product) return;
    if (!confirm(`¿Eliminar "${product.name}"? Si ya tiene ventas, sólo se desactivará.`)) return;
    start(async () => {
      const res = await deleteProduct(product.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  const price = Number(priceText || 0);
  const cost = Number(costText || 0);

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-5">
      {/* Vista previa + apariencia */}
      <div className="space-y-3">
        <div className="mx-auto w-44 md:w-full aspect-[4/5] rounded-3xl border-[3px] border-cocoa-700 bg-white p-2 flex flex-col shadow-[0_4px_0_0_#3a0803]">
          <div
            className="flex-1 rounded-2xl grid place-items-center overflow-hidden"
            style={{ backgroundColor: `${form.color}33` }}
          >
            <ProductVisual product={{ ...form, name: form.name }} className="size-full text-7xl" />
          </div>
          <p className="pt-2 px-1 font-display font-semibold leading-tight line-clamp-2">
            {form.name || "Nombre"}
          </p>
          <p className="px-1 font-display text-lg font-bold text-chili-600">${price.toFixed(2)}</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <ImagePlus className="size-4" /> {uploading ? "Subiendo…" : "Foto"}
          </Button>
          {form.image_url && (
            <Button size="sm" variant="ghost" onClick={() => set("image_url", null)} aria-label="Quitar foto">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Nombre">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Ej. Palomitas grandes" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de venta">
            <input
              inputMode="decimal"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ""))}
              className={inputClass}
              placeholder="$0.00"
            />
          </Field>
          <Field label="Costo (opcional)" hint={costText && price > 0 ? `Ganancia ${((price - cost) / price * 100).toFixed(0)}%` : undefined}>
            <input
              inputMode="decimal"
              value={costText}
              onChange={(e) => setCostText(e.target.value.replace(/[^\d.]/g, ""))}
              className={inputClass}
              placeholder="$0.00"
            />
          </Field>
        </div>

        <Field label="Categoría">
          <select
            value={form.category_id ?? ""}
            onChange={(e) => set("category_id", e.target.value || null)}
            className={inputClass}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-2xl bg-cream-200/70 p-3 space-y-3">
          <Toggle checked={form.track_stock} onChange={(v) => set("track_stock", v)} label="Controlar inventario" />
          {form.track_stock && (
            <Toggle
              checked={form.allow_oversell}
              onChange={(v) => set("allow_oversell", v)}
              label="Vender aunque no haya stock"
            />
          )}
          {form.track_stock && form.allow_oversell && (
            <p className="text-xs font-semibold text-cocoa-400 -mt-1">
              Ideal para palomitas: nunca se bloquea la venta. El stock puede quedar en negativo y se compensa al reabastecer.
            </p>
          )}
          {form.track_stock && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={product ? "Stock actual" : "Stock inicial"}>
                <input
                  inputMode="numeric"
                  value={String(form.stock)}
                  onChange={(e) => set("stock", Number(e.target.value.replace(/\D/g, "") || 0))}
                  className={inputClass}
                />
              </Field>
              <Field label="Avisar cuando queden">
                <input
                  inputMode="numeric"
                  value={String(form.low_stock_alert)}
                  onChange={(e) => set("low_stock_alert", Number(e.target.value.replace(/\D/g, "") || 0))}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>

        {!form.image_url && (
          <Field label="Ícono">
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("emoji", e)}
                  className={`aspect-square rounded-xl text-2xl grid place-items-center border-2 ${
                    form.emoji === e ? "border-cocoa-700 bg-butter-200" : "border-transparent bg-white"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                aria-label={`Color ${c}`}
                className={`size-10 rounded-full border-[3px] ${form.color === c ? "border-cocoa-700 scale-110" : "border-white"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>

        <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Visible en el punto de venta" />
        <Toggle
          checked={form.is_favorite}
          onChange={(v) => set("is_favorite", v)}
          label="⭐ Favorito (aparece en la pestaña Favoritos al vender)"
        />

        {error && <Alert>{error}</Alert>}

        <div className="flex gap-2 pt-2">
          {product && (
            <Button variant="ghost" onClick={remove} disabled={pending} className="text-chili-600">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={submit} disabled={pending || uploading}>
            {pending ? "Guardando…" : "Guardar producto"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 font-bold text-cocoa-600">
      <span className={`w-14 h-8 rounded-full p-1 transition ${checked ? "bg-emerald-500" : "bg-cocoa-300/40"}`}>
        <span className={`block size-6 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : ""}`} />
      </span>
      {label}
    </button>
  );
}

/** Reduce la foto a máx. `size` px y la convierte a JPEG (más ligera para el iPad) */
async function resizeImage(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.85),
  );
}
