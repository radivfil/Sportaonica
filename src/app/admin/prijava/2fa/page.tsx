import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaForm } from "../LoginForm";
import { Logo } from "@/components/site/Logo";
import { usesSupabase } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/clients";
import { LOCAL_SESSION_COOKIE, verifySession } from "@/lib/auth/local-session";

export const metadata: Metadata = { title: "Potvrda prijave (2FA)" };
export const dynamic = "force-dynamic";

const safeNext = (s?: string) => (s && s.startsWith("/admin") && !s.startsWith("//") ? s : "/admin");

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  let factorId: string | undefined;
  let enroll: { qr: string; secret: string } | null = null;

  if (usesSupabase()) {
    const sb = await sessionClient();
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) redirect("/admin/prijava");
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") redirect(next);
    const { data: factors } = await sb.auth.mfa.listFactors();
    const verified = factors?.totp.find((f) => f.status === "verified");
    if (verified) {
      factorId = verified.id;
    } else {
      // first login: set up the authenticator app (2FA is mandatory)
      for (const f of factors?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Sportaonica ${new Date().toISOString().slice(0, 10)}` });
      if (error || !data) throw new Error(error?.message ?? "MFA enrol failed");
      factorId = data.id;
      enroll = { qr: data.totp.qr_code, secret: data.totp.secret };
    }
  } else {
    const pre = await verifySession((await cookies()).get(LOCAL_SESSION_COOKIE)?.value);
    if (!pre) redirect("/admin/prijava");
    if (pre.mfa) redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-flyer px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Korak 2: kod za potvrdu</h1>
          {enroll ? (
            <>
              <p className="mt-2 text-ink-soft">
                Prva prijava: u aplikaciji za autentifikaciju (npr. Google Authenticator, Microsoft Authenticator ili 1Password) skenirajte QR kod, a zatim upišite kod koji aplikacija prikaže.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from Supabase */}
              <img src={enroll.qr} alt="QR kod za aplikaciju za autentifikaciju" width={200} height={200} className="mx-auto mt-4 rounded-2xl bg-white p-2" />
              <p className="mt-3 break-all text-center text-sm text-ink-soft">
                Ručni unos ključa: <code className="font-bold text-ink">{enroll.secret}</code>
              </p>
            </>
          ) : (
            <p className="mt-2 text-ink-soft">Otvorite aplikaciju za autentifikaciju i upišite trenutni 6-znamenkasti kod za Sportaonicu.</p>
          )}
          <MfaForm next={next} factorId={factorId} />
        </div>
      </div>
    </main>
  );
}
