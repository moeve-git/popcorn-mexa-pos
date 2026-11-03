import { connection } from "next/server";
import { db } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import { PosClient } from "./pos-client";

export const metadata = { title: "Vender · Pop Corn Mexa" };

export default async function VentaPage() {
  await connection();
  const supabase = db();

  const [products, categories, session] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("cash_sessions").select("id, shift, opened_at").eq("status", "abierta").maybeSingle(),
  ]);

  return (
    <PosClient
      products={(products.data ?? []) as Product[]}
      categories={(categories.data ?? []) as Category[]}
      session={session.data}
    />
  );
}
