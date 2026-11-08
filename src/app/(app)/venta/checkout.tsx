"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Banknote, CheckCircle2, CreditCard, Delete } from "lucide-react";
import type { PaymentMethod, SaleResult } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Alert, Button, Modal } from "@/components/ui";
import { createSale } from "./actions";

type Step = "method" | "efectivo" | "tarjeta" | "done";

const BILLS = [20, 50, 100, 200, 500, 1000];

export function Checkout({
  open,
  onClose,
  total,
  items,
  onSold,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  items: { product_id: string; quantity: number }[];
  onSold: (r: SaleResult) => void;
}) {
  const [step, setStep] = useState<Step>("method");
  const [received, setReceived] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaleResult | null>(null);
  const [pending, start] = useTransition();

  const receivedNum = Number(received || 0);
  const changeDue = receivedNum - total;

  function reset() {
    setStep("method");
    setReceived("");
    setError(null);
    setResult(null);
  }

  function close() {
    if (pending) return;
    if (step === "done" && result) onSold(result);
    reset();
    onClose();
  }

  function pay(method: PaymentMethod) {
    setError(null);
    start(async () => {
      const res = await createSale(items, method, method === "efectivo" ? receivedNum : null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      setStep("done");
    });
  }

  function press(key: string) {
    setReceived((r) => {
      if (key === "back") return r.slice(0, -1);
      if (key === "clear") return "";
      if (key === "." && r.includes(".")) return r;
      if (r.includes(".") && r.split(".")[1].length >= 2) return r;
      if (r.length >= 8) return r;
      if (r === "0" && key !== ".") return key;
      return r + key;
    });
  }

  const title =
    step === "method"
      ? "¿Cómo paga?"
      : step === "efectivo"
        ? "Pago en efectivo"
        : step === "tarjeta"
          ? "Pago con tarjeta"
          : "¡Venta lista!";

  return (
    <Modal open={open} onClose={close} title={title} size={step === "efectivo" ? "lg" : "md"}>
      {step !== "done" && step !== "method" && (
        <button
          onClick={() => {
            setStep("method");
            setError(null);
          }}
          className="mb-2 sm:mb-3 inline-flex items-center gap-1 font-bold text-cocoa-400 h-8 sm:h-9 text-sm sm:text-base"
        >
          <ArrowLeft className="size-5" /> Cambiar método
        </button>
      )}

      {step === "method" && (
        <div className="space-y-4">
          <TotalBanner total={total} />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStep("efectivo")}
              className="h-40 rounded-3xl border-4 border-cocoa-700 bg-corn-400 shadow-[0_5px_0_0_#3a0803] active:translate-y-1 active:shadow-[0_1px_0_0_#3a0803] flex flex-col items-center justify-center gap-2 font-display text-2xl font-bold"
            >
              <Banknote className="size-14" strokeWidth={1.8} />
              Efectivo
            </button>
            <button
              onClick={() => setStep("tarjeta")}
              className="h-40 rounded-3xl border-4 border-cocoa-700 bg-blush-300 shadow-[0_5px_0_0_#3a0803] active:translate-y-1 active:shadow-[0_1px_0_0_#3a0803] flex flex-col items-center justify-center gap-2 font-display text-2xl font-bold"
            >
              <CreditCard className="size-14" strokeWidth={1.8} />
              Tarjeta
            </button>
          </div>
        </div>
      )}

      {step === "tarjeta" && (
        <div className="space-y-4">
          <TotalBanner total={total} />
          <p className="text-center font-semibold text-cocoa-400">
            Cobra en la terminal y confirma cuando el pago sea aprobado.
          </p>
          {error && <Alert>{error}</Alert>}
          <Button size="xl" className="w-full" onClick={() => pay("tarjeta")} disabled={pending}>
            <CreditCard className="size-7" />
            {pending ? "Registrando…" : `Confirmar ${formatMoney(total)}`}
          </Button>
        </div>
      )}

      {step === "efectivo" && (
        // En celular todo es más compacto para que quepa sin hacer scroll; en iPad, a dos columnas
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-5">
          <div className="space-y-2 sm:space-y-3">
            <div className="rounded-2xl bg-cream-200 px-4 py-2 sm:py-3 flex justify-between items-baseline">
              <span className="font-bold text-cocoa-500">Total</span>
              <span className="font-display text-2xl sm:text-3xl font-bold">{formatMoney(total)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-white border-4 border-cocoa-700 px-3 py-2 sm:px-4 sm:py-3 min-w-0">
                <span className="block font-bold text-cocoa-500 text-sm">Recibido</span>
                <span className="block font-display text-[28px] sm:text-5xl font-bold text-right tabular-nums truncate">
                  {received ? `$${received}` : <span className="text-cocoa-300/60">$0</span>}
                </span>
              </div>
              <div
                className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 border-4 min-w-0 ${
                  received && changeDue >= 0
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                    : "bg-cream-200 border-transparent text-cocoa-500"
                }`}
              >
                <span className="block font-bold text-sm">
                  {received && changeDue < 0 ? (
                    "Falta"
                  ) : (
                    <>
                      Cambio<span className="hidden sm:inline"> a entregar</span>
                    </>
                  )}
                </span>
                <span className="block font-display text-[28px] sm:text-5xl font-bold text-right tabular-nums truncate">
                  {received ? formatMoney(Math.abs(changeDue)) : "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-3 gap-1.5 sm:gap-2">
              <button
                onClick={() => setReceived(total.toFixed(2).replace(/\.00$/, ""))}
                className="h-11 sm:h-12 rounded-xl bg-cocoa-700 text-cream-100 font-display text-sm sm:text-base font-semibold"
              >
                Exacto
              </button>
              {BILLS.filter((b) => b >= total)
                .slice(0, 5)
                .map((b, i) => (
                  <button
                    key={b}
                    onClick={() => setReceived(String(b))}
                    className={`h-11 sm:h-12 rounded-xl bg-emerald-100 border-2 border-emerald-700/30 text-emerald-900 font-display text-sm sm:text-lg font-semibold ${
                      i === 4 ? "max-sm:hidden" : ""
                    }`}
                  >
                    ${b}
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-2 border-line shadow-[0_3px_0_0_#f1dcb6] active:translate-y-0.5 active:shadow-none font-display text-2xl sm:text-3xl font-semibold grid place-items-center"
                  aria-label={k === "back" ? "Borrar" : k}
                >
                  {k === "back" ? <Delete className="size-6 sm:size-7" /> : k}
                </button>
              ))}
            </div>
            {error && <Alert>{error}</Alert>}
            <Button
              size="xl"
              className="w-full max-sm:h-14 max-sm:text-xl"
              disabled={pending || !received || changeDue < 0}
              onClick={() => pay("efectivo")}
            >
              {pending ? "Registrando…" : "Cobrar"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="text-center space-y-4 py-2">
          <CheckCircle2 className="size-16 mx-auto text-emerald-600" />
          <p className="font-bold text-cocoa-400">
            Folio #{result.folio} · {result.payment_method === "efectivo" ? "Efectivo" : "Tarjeta"}
          </p>
          {result.payment_method === "efectivo" ? (
            <div className="rounded-3xl bg-emerald-50 border-4 border-emerald-600 p-5">
              <p className="font-bold text-emerald-800">Entrega de cambio</p>
              <p className="font-display text-6xl font-bold text-emerald-900 tabular-nums">
                {formatMoney(result.change)}
              </p>
              <p className="mt-2 font-semibold text-emerald-800">
                Recibido {formatMoney(result.amount_received)} · Total {formatMoney(result.total)}
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-cream-200 p-5">
              <p className="font-bold text-cocoa-500">Cobrado con tarjeta</p>
              <p className="font-display text-5xl font-bold">{formatMoney(result.total)}</p>
            </div>
          )}
          <Button size="xl" className="w-full" onClick={close}>
            Nueva venta
          </Button>
        </div>
      )}
    </Modal>
  );
}

function TotalBanner({ total }: { total: number }) {
  return (
    <div className="rounded-3xl bg-cocoa-700 text-center py-5">
      <p className="font-bold text-cream-300">Total a cobrar</p>
      <p className="font-display text-6xl font-bold text-corn-400 tabular-nums">{formatMoney(total)}</p>
    </div>
  );
}
