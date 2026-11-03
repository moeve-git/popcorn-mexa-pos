"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ChevronLeft, ChevronRight, CreditCard, Ban } from "lucide-react";
import { addDays, formatLongDate, formatMoney, formatTime, todayLocal } from "@/lib/format";
import { Alert, Button, Card, Field, inputClass, Modal, PageHeader } from "@/components/ui";
import { cancelSale } from "./actions";

export type SaleRow = {
  id: string;
  folio: number;
  created_at: string;
  total: number;
  payment_method: "efectivo" | "tarjeta";
  amount_received: number;
  change_given: number;
  status: "completada" | "cancelada";
  cancel_reason: string | null;
  session_id: string;
  sale_items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
};

export function SalesClient({
  date,
  sales,
  openSessionId,
}: {
  date: string;
  sales: SaleRow[];
  openSessionId: string | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "efectivo" | "tarjeta">("all");
  const [toCancel, setToCancel] = useState<SaleRow | null>(null);

  const done = sales.filter((s) => s.status === "completada");
  const total = done.reduce((a, s) => a + Number(s.total), 0);
  const cash = done.filter((s) => s.payment_method === "efectivo").reduce((a, s) => a + Number(s.total), 0);
  const card = total - cash;
  const list = sales.filter((s) => filter === "all" || s.payment_method === filter);
  const isToday = date === todayLocal();

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <PageHeader title="Ventas" subtitle="Historial de tickets por día" />

      <div className="flex items-center gap-2 mb-4">
        <Link href={`/ventas?date=${addDays(date, -1)}`} className="size-12 grid place-items-center rounded-2xl bg-white border-2 border-line" aria-label="Día anterior">
          <ChevronLeft className="size-6" />
        </Link>
        <label className="flex-1 relative">
          <span className="block h-12 rounded-2xl bg-white border-2 border-line px-4 font-display text-lg font-semibold leading-[44px] text-center capitalize truncate">
            {isToday ? "Hoy" : formatLongDate(date)}
          </span>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => e.target.value && router.push(`/ventas?date=${e.target.value}`)}
            className="absolute inset-0 opacity-0"
            aria-label="Elegir fecha"
          />
        </label>
        <Link
          href={`/ventas?date=${addDays(date, 1)}`}
          aria-disabled={isToday}
          className={`size-12 grid place-items-center rounded-2xl bg-white border-2 border-line ${isToday ? "pointer-events-none opacity-40" : ""}`}
          aria-label="Día siguiente"
        >
          <ChevronRight className="size-6" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Summary label="Total" value={formatMoney(total)} sub={`${done.length} tickets`} />
        <Summary label="Efectivo" value={formatMoney(cash)} />
        <Summary label="Tarjeta" value={formatMoney(card)} />
      </div>

      <div className="flex gap-2 mb-3">
        {(["all", "efectivo", "tarjeta"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-10 px-4 rounded-full font-display font-semibold border-2 ${
              filter === f ? "bg-cocoa-700 border-cocoa-700 text-corn-400" : "bg-white border-line text-cocoa-500"
            }`}
          >
            {f === "all" ? "Todos" : f === "efectivo" ? "Efectivo" : "Tarjeta"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center font-semibold text-cocoa-300">Sin ventas este día</Card>
      ) : (
        <div className="space-y-2">
          {list.map((s) => {
            const cancelled = s.status === "cancelada";
            return (
              <Card key={s.id} className={`p-3 md:p-4 ${cancelled ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <span
                    className={`size-11 shrink-0 rounded-xl grid place-items-center ${
                      s.payment_method === "efectivo" ? "bg-corn-400" : "bg-blush-300"
                    }`}
                  >
                    {s.payment_method === "efectivo" ? <Banknote className="size-6" /> : <CreditCard className="size-6" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold">
                        #{s.folio} · {formatTime(s.created_at)}
                        {cancelled && <span className="ml-2 text-xs font-extrabold text-chili-600 uppercase">Cancelada</span>}
                      </p>
                      <p className={`font-display text-xl font-bold ${cancelled ? "line-through" : ""}`}>{formatMoney(s.total)}</p>
                    </div>
                    <p className="text-sm font-semibold text-cocoa-400">
                      {s.sale_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                    </p>
                    {s.payment_method === "efectivo" && !cancelled && (
                      <p className="text-xs font-bold text-cocoa-300 mt-0.5">
                        Recibido {formatMoney(s.amount_received)} · Cambio {formatMoney(s.change_given)}
                      </p>
                    )}
                    {cancelled && s.cancel_reason && (
                      <p className="text-xs font-bold text-chili-600 mt-0.5">Motivo: {s.cancel_reason}</p>
                    )}
                  </div>
                </div>
                {!cancelled && s.session_id === openSessionId && (
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="ghost" className="text-chili-600" onClick={() => setToCancel(s)}>
                      <Ban className="size-4" /> Cancelar venta
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={toCancel !== null} onClose={() => setToCancel(null)} title={`Cancelar ticket #${toCancel?.folio ?? ""}`} size="sm">
        {toCancel && <CancelForm sale={toCancel} onDone={() => { setToCancel(null); router.refresh(); }} />}
      </Modal>
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white border-2 border-line p-3">
      <p className="text-xs font-bold text-cocoa-400">{label}</p>
      <p className="font-display text-lg md:text-2xl font-bold truncate">{value}</p>
      {sub && <p className="text-xs font-bold text-cocoa-300">{sub}</p>}
    </div>
  );
}

function CancelForm({ sale, onDone }: { sale: SaleRow; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <p className="font-semibold text-cocoa-500">
        Se regresará el stock de los productos y el ticket de {formatMoney(sale.total)} no contará en el corte.
        {sale.payment_method === "efectivo" && " Recuerda devolver el efectivo al cliente."}
      </p>
      <Field label="Motivo">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Ej. se cobró doble" />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button
        variant="danger"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await cancelSale(sale.id, reason);
            if (!res.ok) setError(res.error);
            else onDone();
          })
        }
      >
        {pending ? "Cancelando…" : "Cancelar venta"}
      </Button>
    </div>
  );
}
