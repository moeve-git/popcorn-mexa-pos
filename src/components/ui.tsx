"use client";

import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "corn" | "dark";

const variants: Record<Variant, string> = {
  primary: "bg-chili-600 text-white hover:bg-chili-700 active:bg-chili-700 shadow-pop",
  danger: "bg-chili-700 text-white hover:bg-chili-700/90 shadow-pop",
  corn: "bg-corn-400 text-cocoa-700 hover:bg-butter-300 shadow-pop",
  dark: "bg-cocoa-700 text-cream-100 hover:bg-cocoa-600 shadow-pop",
  secondary: "bg-white text-cocoa-700 border-2 border-line hover:border-corn-400",
  ghost: "bg-transparent text-cocoa-600 hover:bg-cream-300/60",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
    md: "h-12 px-4 text-base rounded-2xl gap-2",
    lg: "h-14 px-6 text-lg rounded-2xl gap-2",
    xl: "h-20 px-6 text-2xl rounded-3xl gap-3",
  };
  return (
    <button
      className={`inline-flex items-center justify-center font-display font-semibold transition active:translate-y-px disabled:opacity-45 disabled:pointer-events-none ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-3xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-cocoa-700/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widths[size]} max-h-[92dvh] flex flex-col bg-cream-50 rounded-t-3xl sm:rounded-3xl shadow-2xl border-4 border-cocoa-700/90 animate-[pop_.18s_ease-out]`}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b-2 border-line">
            <h2 className="font-display text-xl font-semibold text-cocoa-700">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="size-10 grid place-items-center rounded-full hover:bg-cream-300"
            >
              <X className="size-6" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t-2 border-line safe-bottom">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-cocoa-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-cocoa-300 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full h-12 rounded-2xl border-2 border-line bg-white px-4 text-cocoa-700 font-semibold outline-none focus:border-corn-500 focus:ring-4 focus:ring-butter-200 placeholder:text-cocoa-300/70";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`bg-white rounded-3xl border-2 border-line shadow-[0_2px_0_0_#f1dcb6] ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-cocoa-700">{title}</h1>
        {subtitle && <p className="text-cocoa-400 font-semibold mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "ok"; children: ReactNode }) {
  const tones = {
    error: "bg-chili-500/10 text-chili-700 border-chili-500/30",
    info: "bg-butter-200/60 text-cocoa-600 border-corn-400/50",
    ok: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };
  return <div className={`rounded-2xl border-2 px-4 py-3 font-semibold ${tones[tone]}`}>{children}</div>;
}
