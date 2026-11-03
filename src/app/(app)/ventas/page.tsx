import { connection } from "next/server";
import { db } from "@/lib/supabase/server";
import { dayRangeUtc, todayLocal } from "@/lib/format";
import { SalesClient, type SaleRow } from "./sales-client";

export const metadata = { title: "Ventas · Pop Corn Mexa" };

export default async function VentasPage({ searchParams }: PageProps<"/ventas">) {
  await connection();
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayLocal();
  const { start, end } = dayRangeUtc(date);

  const supabase = db();
  const [{ data: sales }, { data: open }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, folio, created_at, total, payment_method, amount_received, change_given, status, cancel_reason, session_id, sale_items(product_name, quantity, unit_price, subtotal)")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("cash_sessions").select("id").eq("status", "abierta").maybeSingle(),
  ]);

  return <SalesClient date={date} sales={(sales ?? []) as SaleRow[]} openSessionId={open?.id ?? null} />;
}
