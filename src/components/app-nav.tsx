"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, Receipt, ShoppingBasket, Wallet } from "lucide-react";

const items = [
  { href: "/venta", label: "Vender", icon: ShoppingBasket },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/caja", label: "Caja", icon: Wallet },
  { href: "/ventas", label: "Ventas", icon: Receipt },
  { href: "/dashboard", label: "Reportes", icon: BarChart3 },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* iPad / escritorio: barra lateral */}
      <nav className="no-print hidden md:flex fixed inset-y-0 left-0 z-30 w-24 flex-col items-center gap-2 bg-cocoa-700 py-4 pl-[env(safe-area-inset-left)]">
        <Link href="/venta" className="mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Pop Corn Mexa" className="size-16 rounded-full" />
        </Link>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`w-20 flex flex-col items-center gap-1 rounded-2xl py-2.5 font-display text-[13px] font-semibold transition ${
                active
                  ? "bg-corn-400 text-cocoa-700 shadow-[0_3px_0_0_#c8760c]"
                  : "text-cream-300 hover:bg-cocoa-600"
              }`}
            >
              <Icon className="size-7" strokeWidth={2.2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Celular: barra inferior */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-cocoa-700 safe-bottom">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold ${
                  active ? "text-corn-400" : "text-cream-300/80"
                }`}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
