import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Prijava" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-flyer px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Prijava za vlasnika</h1>
          <p className="mt-1 text-ink-soft">Upravljanje prijavama, terminima i sadržajem.</p>
          <LoginForm next={next ?? ""} />
          {process.env.NODE_ENV !== "production" || !process.env.ADMIN_PASSWORD ? (
            <p className="mt-6 rounded-2xl bg-butter-100 p-3 text-sm text-ink">
              <strong>Demo:</strong> vlasnik@sportaonica.hr / sportaonica-demo
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
