"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { ActionResult, SessionSummary, Shift } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/caja");
  revalidatePath("/venta");
  revalidatePath("/ventas");
}

export async function openSession(shift: Shift, openingCash: number): Promise<ActionResult> {
  const supabase = db();
  if (!(openingCash >= 0)) return { ok: false, error: "Fondo inválido" };
  const { error } = await supabase.rpc("open_cash_session", {
    p_shift: shift,
    p_opening_cash: openingCash,
  });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true, data: null };
}

export async function addCashMovement(
  sessionId: string,
  type: "entrada" | "salida",
  amount: number,
  reason: string,
): Promise<ActionResult> {
  const supabase = db();
  if (!(amount > 0)) return { ok: false, error: "El monto debe ser mayor a 0" };
  if (!reason.trim()) return { ok: false, error: "Escribe el motivo" };
  const { error } = await supabase
    .from("cash_movements")
    .insert({ session_id: sessionId, type, amount, reason: reason.trim() });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true, data: null };
}

export async function closeSession(
  sessionId: string,
  countedCash: number,
  denominations: Record<string, number> | null,
  notes: string,
): Promise<ActionResult<SessionSummary>> {
  const supabase = db();
  if (!(countedCash >= 0)) return { ok: false, error: "Monto contado inválido" };
  const { data, error } = await supabase.rpc("close_cash_session", {
    p_session_id: sessionId,
    p_counted_cash: countedCash,
    p_denominations: denominations,
    p_notes: notes.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true, data: data as SessionSummary };
}

export async function getSessionSummary(sessionId: string): Promise<ActionResult<SessionSummary>> {
  const supabase = db();
  const { data, error } = await supabase.rpc("session_summary", { p_session_id: sessionId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as SessionSummary };
}
