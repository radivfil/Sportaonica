import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/site/Logo";
import { APP_ENV, usesSupabase } from "@/lib/env";

export const metadata: Metadata = { title: "Prijava" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-flyer px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Prijava za vlasnicu</h1>
          <p className="mt-1 text-ink-soft">Korak 1 od 2: e-mail i lozinka. Zatim kod iz aplikacije za autentifikaciju.</p>
          <LoginForm next={next ?? ""} />
          {APP_ENV === "local" && !usesSupabase() && (
            <p className="mt-6 rounded-2xl bg-butter-100 p-3 text-sm text-ink">
              <strong>Lokalni razvoj:</strong> podaci za prijavu i tajni ključ za 2FA nalaze se u <code>.env.local</code> (vidi README).
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
