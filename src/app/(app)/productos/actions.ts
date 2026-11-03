"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export type ProductInput = {
  name: string;
  category_id: string | null;
  price: number;
  cost: number | null;
  track_stock: boolean;
  stock: number;
  low_stock_alert: number;
  emoji: string;
  color: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

function revalidate() {
  revalidatePath("/productos");
  revalidatePath("/venta");
}

function validate(p: ProductInput): string | null {
  if (!p.name.trim()) return "El nombre es obligatorio";
  if (!(p.price >= 0)) return "Precio inválido";
  if (p.cost !== null && !(p.cost >= 0)) return "Costo inválido";
  if (!Number.isInteger(p.stock) || p.stock < 0) return "El stock debe ser un número entero ≥ 0";
  return null;
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult> {
  const supabase = db();
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const payload = { ...input, name: input.name.trim() };

  if (id) {
    // El stock se cambia con ajustes (para dejar bitácora), no editando directo
    const { data: current } = await supabase.from("products").select("stock").eq("id", id).single();
    const { stock, ...rest } = payload;
    const { error } = await supabase.from("products").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
    const delta = stock - (current?.stock ?? stock);
    if (delta !== 0 && input.track_stock) {
      const { error: e2 } = await supabase.rpc("adjust_stock", {
        p_product_id: id,
        p_delta: delta,
        p_reason: "ajuste",
        p_note: "Edición de producto",
      });
      if (e2) return { ok: false, error: e2.message };
    }
  } else {
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) return { ok: false, error: error.message };
    if (input.track_stock && input.stock > 0) {
      await supabase
        .from("stock_movements")
        .insert({ product_id: data.id, quantity: input.stock, reason: "reabasto", note: "Stock inicial" });
    }
  }
  revalidate();
  return { ok: true, data: null };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = db();
  const { count } = await supabase
    .from("sale_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (count && count > 0) {
    // Tiene historial de ventas: sólo se desactiva
    const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidate();
  return { ok: true, data: null };
}

export async function adjustStock(
  id: string,
  delta: number,
  reason: "reabasto" | "ajuste" | "merma",
  note: string,
): Promise<ActionResult<number>> {
  const supabase = db();
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: "Cantidad inválida" };
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: id,
    p_delta: delta,
    p_reason: reason,
    p_note: note.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: data as number };
}

export async function saveCategory(id: string | null, name: string, sortOrder: number): Promise<ActionResult> {
  const supabase = db();
  if (!name.trim()) return { ok: false, error: "Escribe un nombre" };
  const payload = { name: name.trim(), sort_order: sortOrder };
  const { error } = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert(payload);
  if (error) return { ok: false, error: error.code === "23505" ? "Esa categoría ya existe" : error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = db();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: null };
}

export async function uploadProductImage(formData: FormData): Promise<ActionResult<string>> {
  const supabase = db();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Archivo inválido" };
  if (file.size > 900 * 1024) return { ok: false, error: "La imagen es muy pesada" };
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { ok: true, data: data.publicUrl };
}
