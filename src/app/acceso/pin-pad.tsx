"use client";

import { useState, useTransition } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui";
import { enterPin } from "./actions";

export function PinPad() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const err = await enterPin(pin);
      if (err) {
        setError(err);
        setPin("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="h-14 rounded-2xl bg-white border-2 border-line grid place-items-center font-display text-3xl tracking-[0.5em]">
        {pin.replace(/./g, "•") || <span className="text-cocoa-300/50 text-lg tracking-normal">PIN</span>}
      </div>
      {error && <p className="text-center font-bold text-chili-600">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={k}
              onClick={() => {
                setError(null);
                setPin((p) => (k === "back" ? p.slice(0, -1) : (p + k).slice(0, 12)));
              }}
              className="h-16 rounded-2xl bg-white border-2 border-line shadow-[0_3px_0_0_#f1dcb6] active:translate-y-0.5 font-display text-3xl font-semibold grid place-items-center"
              aria-label={k === "back" ? "Borrar" : k}
            >
              {k === "back" ? <Delete className="size-7" /> : k}
            </button>
          ),
        )}
      </div>
      <Button size="lg" className="w-full" onClick={submit} disabled={!pin || pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </div>
  );
}
