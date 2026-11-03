"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Calculator, ChevronRight, Moon, Printer, Sun } from "lucide-react";
import type { CashMovement, CashSession, SessionSummary } from "@/lib/types";
import { formatDateTime, formatMoney, formatTime, SHIFT_LABEL } from "@/lib/format";
import { Alert, Button, Card, Field, inputClass, Modal, PageHeader } from "@/components/ui";
import { OpenSessionForm } from "@/components/open-session-form";
import { addCashMovement, closeSession, getSessionSummary } from "./actions";

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

export function CajaClient({
  summary,
  movements,
  history,
}: {
  summary: SessionSummary | null;
  movements: CashMovement[];
  history: CashSession[];
}) {
  const router = useRouter();
  const [movement, setMovement] = useState<"entrada" | "salida" | null>(null);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<SessionSummary | null>(null);
  const [loadingReport, startReport] = useTransition();

  function openReport(id: string) {
    startReport(async () => {
      const res = await getSessionSummary(id);
      if (res.ok) setReport(res.data);
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <PageHeader title="Caja" subtitle="Apertura, entradas/salidas de efectivo y corte de turno" />

      {!summary ? (
        <Card className="p-5 md:p-6 max-w-lg">
          <h2 className="font-display text-2xl font-bold mb-1">Abrir caja</h2>
          <p className="text-cocoa-400 font-semibold mb-4">Elige el turno y cuenta el fondo inicial.</p>
          <OpenSessionForm onDone={() => router.refresh()} />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="size-12 rounded-2xl bg-corn-400 grid place-items-center border-2 border-cocoa-700">
                  {summary.shift === "manana" ? <Sun className="size-7" /> : <Moon className="size-7" />}
                </span>
                <div>
                  <p className="font-display text-xl font-bold">Turno {SHIFT_LABEL[summary.shift]}</p>
                  <p className="text-sm font-bold text-cocoa-400">Abierta desde {formatTime(summary.opened_at)}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 font-bold px-3 py-1 border-2 border-emerald-200">
                <span className="size-2.5 rounded-full bg-emerald-500" /> Abierta
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Tile label="Ventas totales" value={formatMoney(summary.total_sales)} big />
              <Tile label="Efectivo" value={formatMoney(summary.cash_sales)} />
              <Tile label="Tarjeta" value={formatMoney(summary.card_sales)} />
              <Tile label="Tickets" value={String(summary.sales_count)} />
              <Tile label="Fondo inicial" value={formatMoney(summary.opening_cash)} />
              <Tile
                label="Entradas / salidas"
                value={`+${formatMoney(summary.cash_in)} / −${formatMoney(summary.cash_out)}`}
                small
              />
            </div>

            <div className="mt-4 rounded-3xl bg-cocoa-700 text-cream-100 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-cream-300">Efectivo que debe haber en caja</p>
                <p className="text-xs text-cream-300/80 font-semibold">
                  Fondo + ventas en efectivo + entradas − salidas
                </p>
              </div>
              <p className="font-display text-3xl md:text-4xl font-bold text-corn-400">
                {formatMoney(summary.expected_cash)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setMovement("entrada")}>
                <ArrowDownCircle className="size-5 text-emerald-600" /> Entrada
              </Button>
              <Button variant="secondary" onClick={() => setMovement("salida")}>
                <ArrowUpCircle className="size-5 text-chili-600" /> Salida
              </Button>
            </div>
            <Button size="xl" className="w-full mt-3" onClick={() => setClosing(true)}>
              <Calculator className="size-7" /> Hacer corte de caja
            </Button>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-display text-lg font-bold mb-2">Movimientos de efectivo</h3>
              {movements.length === 0 ? (
                <p className="text-sm font-semibold text-cocoa-300">Sin movimientos. Usa “Salida” para pagos como hielo, gas, etc.</p>
              ) : (
                <ul className="divide-y-2 divide-line">
                  {movements.map((m) => (
                    <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{m.reason}</p>
                        <p className="text-xs font-bold text-cocoa-300">{formatTime(m.created_at)}</p>
                      </div>
                      <span className={`font-display font-bold ${m.type === "entrada" ? "text-emerald-700" : "text-chili-600"}`}>
                        {m.type === "entrada" ? "+" : "−"}
                        {formatMoney(m.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="font-display text-lg font-bold mb-2">Vendido en este turno</h3>
              {summary.products.length === 0 ? (
                <p className="text-sm font-semibold text-cocoa-300">Aún no hay ventas.</p>
              ) : (
                <ul className="space-y-1">
                  {summary.products.map((p) => (
                    <li key={p.name} className="flex justify-between gap-2 font-semibold">
                      <span className="truncate">
                        <b>{p.quantity}×</b> {p.name}
                      </span>
                      <span>{formatMoney(p.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      <h2 className="font-display text-2xl font-bold mt-8 mb-3">Cortes anteriores</h2>
      {history.length === 0 ? (
        <p className="text-cocoa-300 font-semibold">Todavía no hay cortes.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h) => {
            const diff = Number(h.difference ?? 0);
            return (
              <button
                key={h.id}
                onClick={() => openReport(h.id)}
                disabled={loadingReport}
                className="w-full text-left rounded-2xl bg-white border-2 border-line p-3 md:p-4 flex items-center gap-3 hover:border-corn-400"
              >
                <span className="size-10 shrink-0 rounded-xl bg-cream-200 grid place-items-center">
                  {h.shift === "manana" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">
                    {SHIFT_LABEL[h.shift]} · {formatDateTime(h.opened_at)}
                  </p>
                  <p className="text-sm font-semibold text-cocoa-400">
                    {h.sales_count} tickets · Efectivo {formatMoney(h.cash_sales)} · Tarjeta {formatMoney(h.card_sales)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">{formatMoney(h.total_sales)}</p>
                  <DiffBadge diff={diff} />
                </div>
                <ChevronRight className="size-5 text-cocoa-300" />
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={movement !== null}
        onClose={() => setMovement(null)}
        title={movement === "entrada" ? "Entrada de efectivo" : "Salida de efectivo"}
        size="sm"
      >
        {movement && summary && (
          <MovementForm
            type={movement}
            sessionId={summary.session_id}
            onDone={() => {
              setMovement(null);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={closing} onClose={() => setClosing(false)} title="Corte de caja" size="lg">
        {closing && summary && (
          <CloseForm
            summary={summary}
            onDone={(r) => {
              setClosing(false);
              setReport(r);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={report !== null} onClose={() => setReport(null)} title="Reporte de corte" size="md">
        {report && <Report summary={report} />}
      </Modal>
    </div>
  );
}

function Tile({ label, value, big, small }: { label: string; value: string; big?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${big ? "bg-butter-200" : "bg-cream-200/70"}`}>
      <p className="text-xs font-bold text-cocoa-400">{label}</p>
      <p className={`font-display font-bold ${small ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.005)
    return <span className="text-xs font-extrabold text-emerald-700">✓ Cuadró</span>;
  return (
    <span className={`text-xs font-extrabold ${diff > 0 ? "text-corn-600" : "text-chili-600"}`}>
      {diff > 0 ? "Sobrante" : "Faltante"} {formatMoney(Math.abs(diff))}
    </span>
  );
}

function MovementForm({
  type,
  sessionId,
  onDone,
}: {
  type: "entrada" | "salida";
  sessionId: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const presets = type === "salida" ? ["Hielo", "Gas", "Insumos", "Retiro a dueño"] : ["Cambio extra", "Depósito"];

  return (
    <div className="space-y-4">
      <Field label="Monto">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className={`${inputClass} text-2xl h-14`}
          placeholder="$0.00"
          autoFocus
        />
      </Field>
      <Field label="Motivo">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p} onClick={() => setReason(p)} className="h-9 px-3 rounded-full bg-cream-200 font-bold text-sm">
            {p}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await addCashMovement(sessionId, type, Number(amount || 0), reason);
            if (!res.ok) setError(res.error);
            else onDone();
          })
        }
      >
        {pending ? "Guardando…" : "Registrar"}
      </Button>
    </div>
  );
}

function CloseForm({ summary, onDone }: { summary: SessionSummary; onDone: (r: SessionSummary) => void }) {
  const [mode, setMode] = useState<"denoms" | "total">("denoms");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [direct, setDirect] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const denomTotal = DENOMS.reduce((s, d) => s + d * Number(counts[d] || 0), 0);
  const counted = mode === "denoms" ? denomTotal : Number(direct || 0);
  const diff = Math.round((counted - Number(summary.expected_cash)) * 100) / 100;
  const hasInput = mode === "denoms" ? Object.values(counts).some((v) => v !== "") : direct !== "";

  function submit() {
    if (!confirm("¿Cerrar la caja? Después ya no se podrán cancelar ventas de este turno.")) return;
    setError(null);
    start(async () => {
      const denoms =
        mode === "denoms"
          ? Object.fromEntries(Object.entries(counts).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]))
          : null;
      const res = await closeSession(summary.session_id, counted, denoms, notes);
      if (!res.ok) setError(res.error);
      else onDone(res.data);
    });
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("denoms")}
            className={`h-11 rounded-2xl border-[3px] font-display font-semibold ${mode === "denoms" ? "border-cocoa-700 bg-corn-400" : "border-line bg-white"}`}
          >
            Contar billetes
          </button>
          <button
            onClick={() => setMode("total")}
            className={`h-11 rounded-2xl border-[3px] font-display font-semibold ${mode === "total" ? "border-cocoa-700 bg-corn-400" : "border-line bg-white"}`}
          >
            Total directo
          </button>
        </div>

        {mode === "denoms" ? (
          <div className="grid grid-cols-2 gap-2">
            {DENOMS.map((d) => (
              <label key={d} className="flex items-center gap-2 rounded-2xl bg-white border-2 border-line pl-3 pr-1 h-12">
                <span className={`w-14 font-display font-bold ${d >= 20 ? "text-emerald-800" : "text-cocoa-500"}`}>
                  ${d === 0.5 ? "0.50" : d}
                </span>
                <span className="text-cocoa-300 font-bold">×</span>
                <input
                  inputMode="numeric"
                  value={counts[d] ?? ""}
                  onChange={(e) => setCounts((c) => ({ ...c, [d]: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1 min-w-0 h-10 rounded-xl bg-cream-100 text-right px-2 font-bold outline-none focus:ring-2 focus:ring-corn-400"
                  placeholder="0"
                />
              </label>
            ))}
          </div>
        ) : (
          <Field label="Efectivo contado">
            <input
              inputMode="decimal"
              value={direct}
              onChange={(e) => setDirect(e.target.value.replace(/[^\d.]/g, ""))}
              className={`${inputClass} text-3xl h-16`}
              placeholder="$0.00"
              autoFocus
            />
          </Field>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl bg-cream-200/70 p-4 space-y-1.5 font-semibold">
          <Row label="Fondo inicial" value={formatMoney(summary.opening_cash)} />
          <Row label="+ Ventas en efectivo" value={formatMoney(summary.cash_sales)} />
          <Row label="+ Entradas" value={formatMoney(summary.cash_in)} />
          <Row label="− Salidas" value={formatMoney(summary.cash_out)} />
          <div className="border-t-2 border-line pt-1.5">
            <Row label="Debe haber" value={formatMoney(summary.expected_cash)} bold />
          </div>
          <Row label="Ventas con tarjeta (terminal)" value={formatMoney(summary.card_sales)} />
        </div>
        <div className="rounded-2xl bg-white border-4 border-cocoa-700 p-4">
          <Row label="Contado" value={formatMoney(counted)} bold />
          {hasInput && (
            <div
              className={`mt-2 rounded-xl px-3 py-2 font-display text-xl font-bold text-center ${
                Math.abs(diff) < 0.005
                  ? "bg-emerald-50 text-emerald-800"
                  : diff > 0
                    ? "bg-butter-200 text-cocoa-600"
                    : "bg-chili-500/10 text-chili-700"
              }`}
            >
              {Math.abs(diff) < 0.005
                ? "✓ ¡La caja cuadra!"
                : `${diff > 0 ? "Sobran" : "Faltan"} ${formatMoney(Math.abs(diff))}`}
            </div>
          )}
        </div>
        <Field label="Notas (opcional)">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button size="lg" className="w-full" disabled={pending || !hasInput} onClick={submit}>
          {pending ? "Cerrando…" : "Cerrar caja"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-display text-lg font-bold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Report({ summary: s }: { summary: SessionSummary }) {
  const diff = Number(s.difference ?? 0);
  return (
    <div className="space-y-4" id="corte">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="size-20 mx-auto" />
        <p className="font-display text-xl font-bold">Corte turno {SHIFT_LABEL[s.shift]}</p>
        <p className="text-sm font-semibold text-cocoa-400">
          {formatDateTime(s.opened_at)} → {s.closed_at ? formatDateTime(s.closed_at) : "abierta"}
        </p>
      </div>
      <div className="rounded-2xl bg-cream-200/70 p-4 space-y-1.5 font-semibold">
        <Row label="Tickets" value={String(s.sales_count)} />
        {s.cancelled_count > 0 && <Row label="Cancelados" value={String(s.cancelled_count)} />}
        <Row label="Ventas en efectivo" value={formatMoney(s.cash_sales)} />
        <Row label="Ventas con tarjeta" value={formatMoney(s.card_sales)} />
        <Row label="Total vendido" value={formatMoney(s.total_sales)} bold />
      </div>
      <div className="rounded-2xl bg-cream-200/70 p-4 space-y-1.5 font-semibold">
        <Row label="Fondo inicial" value={formatMoney(s.opening_cash)} />
        <Row label="Entradas" value={formatMoney(s.cash_in)} />
        <Row label="Salidas" value={formatMoney(s.cash_out)} />
        <Row label="Efectivo esperado" value={formatMoney(s.expected_cash)} bold />
        <Row label="Efectivo contado" value={formatMoney(s.counted_cash)} bold />
        <div className="pt-1 text-right">
          <DiffBadge diff={diff} />
        </div>
      </div>
      {s.products.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-line p-4 space-y-1 font-semibold">
          {s.products.map((p) => (
            <Row key={p.name} label={`${p.quantity}× ${p.name}`} value={formatMoney(p.total)} />
          ))}
        </div>
      )}
      {s.notes && <p className="font-semibold text-cocoa-500">Notas: {s.notes}</p>}
      <Button variant="secondary" className="w-full no-print" onClick={() => window.print()}>
        <Printer className="size-5" /> Imprimir
      </Button>
    </div>
  );
}
