import { connection } from "next/server";
import { db } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import { ProductsClient } from "./products-client";

export const metadata = { title: "Productos · Pop Corn Mexa" };

export default async function ProductosPage() {
  await connection();
  const supabase = db();
  const [products, categories] = await Promise.all([
    supabase.from("products").select("*").order("sort_order").order("name"),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);

  return (
    <ProductsClient
      products={(products.data ?? []) as Product[]}
      categories={(categories.data ?? []) as Category[]}
    />
  );
}
