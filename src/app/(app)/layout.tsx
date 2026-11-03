import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-24 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <AppNav />
      <main className="min-h-dvh">{children}</main>
    </div>
  );
}
