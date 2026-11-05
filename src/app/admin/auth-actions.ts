"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { APP_ENV, usesSupabase } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/clients";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LOCAL_SESSION_COOKIE, PRE_MFA_MAX_AGE_S, SESSION_MAX_AGE_S, safeEqual, signSession, verifySession } from "@/lib/auth/local-session";
import { verifyTotp } from "@/lib/auth/totp";
import { adminRepo } from "@/lib/data";

export type LoginState = { error?: string };

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/admin") && !s.startsWith("//") ? s : "/admin";
};

const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

async function limited(scope: string, max: number) {
  const ip = clientIp(await headers());
  return !(await rateLimit(scope, ip, max, 15 * 60)).ok;
}

/** Step 1: e-mail + password. */
export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  if (await limited("login", 5)) return { error: "Previše pokušaja. Pričekajte 15 minuta." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(fd.get("next"));

  if (usesSupabase()) {
    const sb = await sessionClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      await new Promise((r) => setTimeout(r, 400));
      return { error: "Pogrešan e-mail ili lozinka." };
    }
    redirect(`/admin/prijava/2fa?next=${encodeURIComponent(next)}`);
  }

  // local development login (refused outside APP_ENV=local)
  if (APP_ENV !== "local") return { error: "Lokalna prijava nije dopuštena u ovom okruženju." };
  const okEmail = safeEqual(email, (process.env.ADMIN_EMAIL || "vlasnica@sportaonica.test").toLowerCase());
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD || "demo-lozinka-123");
  if (!okEmail || !okPass) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Pogrešan e-mail ili lozinka." };
  }
  (await cookies()).set(LOCAL_SESSION_COOKIE, await signSession(email, false), cookieOpts(PRE_MFA_MAX_AGE_S));
  redirect(`/admin/prijava/2fa?next=${encodeURIComponent(next)}`);
}

/** Step 2: TOTP code (enrolment on first login in Supabase mode). */
export async function verifyMfa(_prev: LoginState, fd: FormData): Promise<LoginState> {
  if (await limited("mfa", 6)) return { error: "Previše pokušaja. Pričekajte 15 minuta." };
  const code = String(fd.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(fd.get("next"));
  if (!/^\d{6}$/.test(code)) return { error: "Upišite 6-znamenkasti kod iz aplikacije." };

  if (usesSupabase()) {
    const sb = await sessionClient();
    const factorId = String(fd.get("factorId") ?? "");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { error: "Kod nije ispravan ili je istekao. Pokušajte ponovno." };
    await auditLogin();
    redirect(next);
  }

  const jar = await cookies();
  const pre = await verifySession(jar.get(LOCAL_SESSION_COOKIE)?.value);
  if (!pre) redirect("/admin/prijava");
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) return { error: "ADMIN_TOTP_SECRET nije postavljen (vidi README)." };
  if (!(await verifyTotp(secret, code))) return { error: "Kod nije ispravan ili je istekao. Pokušajte ponovno." };
  jar.set(LOCAL_SESSION_COOKIE, await signSession(pre.sub, true), cookieOpts(SESSION_MAX_AGE_S));
  await auditLogin();
  redirect(next);
}

async function auditLogin() {
  try {
    await (await adminRepo()).audit("auth.login");
  } catch {
    // never block a successful login because of the audit write
  }
}

export async function logout() {
  const repo = await adminRepo().catch(() => null);
  await repo?.audit("auth.logout").catch(() => undefined);
  if (usesSupabase()) {
    const sb = await sessionClient();
    await sb.auth.signOut();
  }
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
  redirect("/admin/prijava");
}
