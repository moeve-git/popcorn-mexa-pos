"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function cancelSale(id: string, reason: string): Promise<ActionResult> {
  const supabase = db();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: id, p_reason: reason.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ventas");
  revalidatePath("/venta");
  revalidatePath("/caja");
  revalidatePath("/productos");
  return { ok: true, data: null };
}
