import { connection } from "next/server";
import { db } from "@/lib/supabase/server";
import { TZ, todayLocal } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";
import { Alert } from "@/components/ui";
import { DashboardClient } from "./dashboard-client";

export const metadata = { title: "Reportes · Pop Corn Mexa" };

const VIEWS = ["day", "week", "month"] as const;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await connection();
  const sp = await searchParams;
  const view = VIEWS.includes(sp.view as (typeof VIEWS)[number]) ? (sp.view as (typeof VIEWS)[number]) : "day";
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayLocal();

  const { data, error } = await db().rpc("dashboard_stats", { p_view: view, p_date: date, p_tz: TZ });

  if (error) {
    return (
      <div className="p-6">
        <Alert>No se pudieron cargar los reportes: {error.message}</Alert>
      </div>
    );
  }

  return <DashboardClient view={view} date={date} stats={data as DashboardStats} />;
}
