"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardStats } from "@/lib/types";
import { addDays, addMonths, formatMoney, formatShortDate, todayLocal } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";

type View = "day" | "week" | "month";

// Validado (CVD / visión normal) contra fondo claro
const CASH = "#d9302c";
const CARD = "#e8a317";

const VIEW_LABEL: Record<View, string> = { day: "Día", week: "Semana", month: "Mes" };
const PREV_LABEL: Record<View, string> = { day: "ayer", week: "semana pasada", month: "mes pasado" };

export function DashboardClient({ view, date, stats }: { view: View; date: string; stats: DashboardStats }) {
  const today = todayLocal();
  const step = (dir: 1 | -1) =>
    view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir);
  const next = step(1);
  const canNext = (view === "month" ? next.slice(0, 7) <= today.slice(0, 7) : stats.end < today);

  const s = stats.summary;
  const p = stats.previous;

  const series = buildSeries(stats);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <PageHeader title="Reportes" subtitle="Ventas diarias, semanales y mensuales" />

      {/* Filtros en una sola fila */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex rounded-2xl bg-white border-2 border-line p-1">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <Link
              key={v}
              href={`/dashboard?view=${v}&date=${date}`}
              className={`h-10 px-4 rounded-xl font-display font-semibold grid place-items-center ${
                view === v ? "bg-cocoa-700 text-corn-400" : "text-cocoa-500"
              }`}
            >
              {VIEW_LABEL[v]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Link href={`/dashboard?view=${view}&date=${step(-1)}`} className="size-12 grid place-items-center rounded-2xl bg-white border-2 border-line" aria-label="Anterior">
            <ChevronLeft className="size-6" />
          </Link>
          <div className="flex-1 h-12 rounded-2xl bg-white border-2 border-line grid place-items-center font-display text-lg font-semibold capitalize truncate px-3">
            {periodLabel(view, stats, today)}
          </div>
          <Link
            href={`/dashboard?view=${view}&date=${next}`}
            className={`size-12 grid place-items-center rounded-2xl bg-white border-2 border-line ${canNext ? "" : "pointer-events-none opacity-40"}`}
            aria-label="Siguiente"
          >
            <ChevronRight className="size-6" />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Ventas" value={formatMoney(s.total)} now={s.total} prev={p.total} prevLabel={PREV_LABEL[view]} hero />
        <Kpi label="Tickets" value={String(s.count)} now={s.count} prev={p.count} prevLabel={PREV_LABEL[view]} />
        <Kpi label="Ticket promedio" value={formatMoney(s.avg)} now={s.avg} prev={p.avg} prevLabel={PREV_LABEL[view]} />
        <Kpi label="Artículos vendidos" value={String(s.items)} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-xl font-bold">
              Ventas por {view === "day" ? "hora" : "día"}
            </h2>
            <div className="flex gap-4 text-sm font-bold text-cocoa-500">
              <LegendDot color={CASH} label="Efectivo" />
              <LegendDot color={CARD} label="Tarjeta" />
            </div>
          </div>
          <div className="h-72 md:h-80">
            {s.count === 0 ? (
              <div className="h-full grid place-items-center text-cocoa-300 font-semibold">Sin ventas en este periodo</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid vertical={false} stroke="#f1dcb6" strokeDasharray="0" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "#e3c99c" }}
                    tick={{ fill: "#874b1f", fontSize: 12, fontWeight: 700 }}
                    interval="preserveStartEnd"
                    minTickGap={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: "#ad7f5a", fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${v}`)}
                  />
                  <Tooltip cursor={{ fill: "#fdeac2", opacity: 0.6 }} content={<ChartTooltip />} />
                  <Bar dataKey="cash" name="Efectivo" stackId="a" fill={CASH} stroke="#fffbf3" strokeWidth={2} />
                  <Bar dataKey="card" name="Tarjeta" stackId="a" fill={CARD} stroke="#fffbf3" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="font-display text-xl font-bold mb-3">Forma de pago</h2>
          <PaymentSplit cash={s.cash} card={s.card} cashCount={s.cash_count} cardCount={s.card_count} />
          {stats.categories.length > 0 && (
            <>
              <h3 className="font-display text-lg font-bold mt-5 mb-2">Por categoría</h3>
              <ul className="space-y-2">
                {stats.categories.map((c) => (
                  <ShareRow key={c.name} name={c.name} total={c.total} max={stats.categories[0].total} sub={`${c.quantity} pzs`} />
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card className="p-4 md:p-5 mt-4">
        <h2 className="font-display text-xl font-bold mb-3">Productos más vendidos</h2>
        {stats.top.length === 0 ? (
          <p className="text-cocoa-300 font-semibold">Sin datos</p>
        ) : (
          <ol className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            {stats.top.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="size-8 shrink-0 rounded-full bg-cream-200 grid place-items-center font-display font-bold text-cocoa-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <ShareRow name={t.name} total={t.total} max={stats.top[0].total} sub={`${t.quantity} pzs`} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function buildSeries(stats: DashboardStats) {
  const rows = stats.series.map((r) => {
    const [d, t] = r.bucket.split("T");
    let label: string;
    if (stats.view === "day") label = `${Number(t.slice(0, 2))}h`;
    else if (stats.view === "week") {
      const wd = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
      label = `${wd.replace(".", "")} ${Number(d.slice(8))}`;
    } else label = String(Number(d.slice(8)));
    return { ...r, label, total: Number(r.total), cash: Number(r.cash), card: Number(r.card), date: d };
  });
  if (stats.view !== "day") return rows;
  // Recorta las horas sin movimiento fuera del horario típico (10h–22h)
  const withSales = rows.map((r, i) => (r.count > 0 ? i : -1)).filter((i) => i >= 0);
  const first = Math.min(10, withSales[0] ?? 10);
  const last = Math.max(22, withSales[withSales.length - 1] ?? 22);
  return rows.slice(first, last + 1);
}

function periodLabel(view: View, stats: DashboardStats, today: string) {
  if (view === "day") {
    if (stats.start === today) return "Hoy";
    if (stats.start === addDays(today, -1)) return "Ayer";
    return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(`${stats.start}T12:00:00Z`),
    );
  }
  if (view === "week") return `${formatShortDate(stats.start)} – ${formatShortDate(stats.end)}`;
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${stats.start}T12:00:00Z`),
  );
}

function Kpi({
  label,
  value,
  now,
  prev,
  prevLabel,
  hero,
}: {
  label: string;
  value: string;
  now?: number;
  prev?: number;
  prevLabel?: string;
  hero?: boolean;
}) {
  let delta: number | null = null;
  if (now !== undefined && prev !== undefined && Number(prev) > 0) delta = (Number(now) - Number(prev)) / Number(prev);
  return (
    <div className={`rounded-3xl p-4 border-2 ${hero ? "bg-cocoa-700 border-cocoa-700 text-cream-100" : "bg-white border-line"}`}>
      <p className={`text-sm font-bold ${hero ? "text-cream-300" : "text-cocoa-400"}`}>{label}</p>
      <p className={`font-display text-2xl md:text-3xl font-bold truncate ${hero ? "text-corn-400" : ""}`}>{value}</p>
      {delta !== null && (
        <p className={`mt-1 text-xs font-extrabold inline-flex items-center gap-1 ${hero ? "text-cream-200" : "text-cocoa-500"}`}>
          {delta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          {delta >= 0 ? "+" : ""}
          {Math.round(delta * 100)}% vs {prevLabel}
        </p>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function PaymentSplit({ cash, card, cashCount, cardCount }: { cash: number; card: number; cashCount: number; cardCount: number }) {
  const total = Number(cash) + Number(card);
  const pc = total > 0 ? (Number(cash) / total) * 100 : 0;
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-cream-200 gap-[2px]">
        {total > 0 && (
          <>
            {pc > 0 && <div style={{ width: `${pc}%`, backgroundColor: CASH }} />}
            {pc < 100 && <div style={{ width: `${100 - pc}%`, backgroundColor: CARD }} />}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <LegendDot color={CASH} label="Efectivo" />
          <p className="font-display text-xl font-bold">{formatMoney(cash)}</p>
          <p className="text-xs font-bold text-cocoa-400">
            {cashCount} tickets · {total > 0 ? Math.round(pc) : 0}%
          </p>
        </div>
        <div>
          <LegendDot color={CARD} label="Tarjeta" />
          <p className="font-display text-xl font-bold">{formatMoney(card)}</p>
          <p className="text-xs font-bold text-cocoa-400">
            {cardCount} tickets · {total > 0 ? 100 - Math.round(pc) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

function ShareRow({ name, total, max, sub }: { name: string; total: number; max: number; sub?: string }) {
  const w = Number(max) > 0 ? (Number(total) / Number(max)) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between gap-2 text-sm font-bold">
        <span className="truncate">{name}</span>
        <span className="shrink-0">
          {formatMoney(total)} {sub && <span className="text-cocoa-300 font-semibold">· {sub}</span>}
        </span>
      </div>
      <div className="h-2 mt-1 rounded-full bg-cream-200 overflow-hidden">
        <div className="h-full rounded-full bg-corn-500" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: { payload: { label: string; total: number; cash: number; card: number; count: number } }[];
};

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl bg-white border-2 border-cocoa-700 px-3 py-2 shadow-lg text-sm font-semibold min-w-40">
      <p className="font-display font-bold mb-1">{d.label}</p>
      <p className="flex justify-between gap-4"><LegendDot color={CASH} label="Efectivo" /> {formatMoney(d.cash)}</p>
      <p className="flex justify-between gap-4"><LegendDot color={CARD} label="Tarjeta" /> {formatMoney(d.card)}</p>
      <p className="flex justify-between gap-4 border-t border-line mt-1 pt-1 font-bold">
        <span>Total · {d.count} tickets</span> {formatMoney(d.total)}
      </p>
    </div>
  );
}
