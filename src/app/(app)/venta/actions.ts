"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { ActionResult, PaymentMethod, SaleResult } from "@/lib/types";

export async function createSale(
  items: { product_id: string; quantity: number }[],
  method: PaymentMethod,
  amountReceived: number | null,
): Promise<ActionResult<SaleResult>> {
  const supabase = db();
  const clean = items
    .filter((i) => i.quantity > 0)
    .map((i) => ({ product_id: i.product_id, quantity: Math.floor(i.quantity) }));
  if (clean.length === 0) return { ok: false, error: "Agrega productos a la venta" };

  const { data, error } = await supabase.rpc("create_sale", {
    p_items: clean,
    p_payment_method: method,
    p_amount_received: method === "efectivo" ? amountReceived : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/venta");
  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/productos");
  return { ok: true, data: data as SaleResult };
}
