import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/site/Logo";
import { logout } from "../auth-actions";
import { APP_ENV, usesSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="no-print hidden border-r border-ink/10 bg-[#EEF1F7] p-5 lg:flex lg:flex-col">
        <Logo className="h-10 w-auto" href="/admin" />
        <div className="mt-8 flex-1">
          <AdminNav variant="side" />
        </div>
        <div className="mt-6 grid gap-2 border-t border-ink/10 pt-5 text-sm">
          <p className="truncate text-ink-soft">{session.email}</p>
          <Link href="/" target="_blank" className="font-bold text-navy underline">Otvori web stranicu ↗</Link>
          <form action={logout}>
            <button className="font-bold text-coral-700 underline">Odjava</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b border-ink/10 bg-[#F6F7FB]/95 px-4 pt-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <Logo className="h-8 w-auto" href="/admin" />
            <form action={logout}>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-bold text-coral-700 ring-1 ring-ink/10">Odjava</button>
            </form>
          </div>
          <AdminNav variant="top" />
        </header>
        {APP_ENV !== "production" && (
          <p className="no-print border-b border-butter-300 bg-butter-100 px-4 py-2 text-center text-sm font-semibold text-ink">
            {usesSupabase() ? "DEMO okruženje: koristite isključivo izmišljene podatke." : "Lokalni način: podaci se spremaju u lokalnu JSON datoteku (.data/db.json)."}
          </p>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
