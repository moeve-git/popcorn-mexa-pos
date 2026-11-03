"use client";

import { useState, useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { openSession } from "@/app/(app)/caja/actions";
import { localHour } from "@/lib/format";
import type { Shift } from "@/lib/types";
import { Alert, Button, Field, inputClass } from "./ui";

export function OpenSessionForm({ onDone }: { onDone?: () => void }) {
  const [shift, setShift] = useState<Shift>(() => (localHour() < 15 ? "manana" : "noche"));
  const [cash, setCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await openSession(shift, Number(cash || 0));
      if (!res.ok) setError(res.error);
      else onDone?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["manana", "Mañana", Sun],
            ["noche", "Noche", Moon],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setShift(value)}
            className={`h-20 rounded-2xl border-4 font-display text-xl font-semibold flex items-center justify-center gap-2 transition ${
              shift === value
                ? "border-cocoa-700 bg-corn-400 text-cocoa-700"
                : "border-line bg-white text-cocoa-400"
            }`}
          >
            <Icon className="size-7" /> {label}
          </button>
        ))}
      </div>
      <Field label="Fondo de caja (efectivo inicial)" hint="Lo que hay en el cajón al empezar el turno">
        <input
          inputMode="decimal"
          value={cash}
          onChange={(e) => setCash(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="$0.00"
          className={`${inputClass} text-2xl h-14`}
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
        {pending ? "Abriendo…" : "Abrir caja"}
      </Button>
    </div>
  );
}
