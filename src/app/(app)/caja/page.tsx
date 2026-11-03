import { connection } from "next/server";
import { db } from "@/lib/supabase/server";
import type { CashMovement, CashSession, SessionSummary } from "@/lib/types";
import { CajaClient } from "./caja-client";

export const metadata = { title: "Caja · Pop Corn Mexa" };

export default async function CajaPage() {
  await connection();
  const supabase = db();

  const [{ data: open }, { data: history }] = await Promise.all([
    supabase.from("cash_sessions").select("id").eq("status", "abierta").maybeSingle(),
    supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "cerrada")
      .order("closed_at", { ascending: false })
      .limit(30),
  ]);

  let summary: SessionSummary | null = null;
  let movements: CashMovement[] = [];
  if (open) {
    const [s, m] = await Promise.all([
      supabase.rpc("session_summary", { p_session_id: open.id }),
      supabase
        .from("cash_movements")
        .select("*")
        .eq("session_id", open.id)
        .order("created_at", { ascending: false }),
    ]);
    summary = s.data as SessionSummary;
    movements = (m.data ?? []) as CashMovement[];
  }

  return (
    <CajaClient summary={summary} movements={movements} history={(history ?? []) as CashSession[]} />
  );
}
