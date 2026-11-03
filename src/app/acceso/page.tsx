import { PinPad } from "./pin-pad";

export const metadata = { title: "Acceso · Pop Corn Mexa" };

export default function AccesoPage() {
  return (
    <main className="min-h-dvh sunburst flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Pop Corn Mexa" className="mx-auto w-48 sm:w-56" />
        <div className="mt-4 bg-cream-50 rounded-3xl border-4 border-cocoa-700 p-6 shadow-[0_6px_0_0_#3a0803]">
          <h1 className="font-display text-2xl font-bold text-center mb-4">Escribe el PIN</h1>
          <PinPad />
        </div>
      </div>
    </main>
  );
}
