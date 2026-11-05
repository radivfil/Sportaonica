import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usesSupabase } from "../env";
import { sessionClient } from "../supabase/clients";
import { LOCAL_SESSION_COOKIE, SESSION_MAX_AGE_S, verifySession } from "./local-session";

export interface AdminSession {
  email: string;
  mode: "supabase" | "local";
}

/**
 * The owner's session, or null. Requirements (both modes):
 *  - valid login, 2FA (TOTP) completed,
 *  - at most SESSION_MAX_AGE_S (8 h) since the 2FA step,
 *  - Supabase: the user is listed in public.admins (checked by the DB itself).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (usesSupabase()) {
    const sb = await sessionClient();
    const { data: userData } = await sb.auth.getUser(); // verifies the JWT with Supabase Auth
    const user = userData.user;
    if (!user) return null;
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return null;
    const totpEntry = aal.currentAuthenticationMethods.find((m) => typeof m === "object" && m.method === "totp");
    const mfaAt = typeof totpEntry === "object" ? totpEntry.timestamp : 0;
    if (Date.now() / 1000 - mfaAt > SESSION_MAX_AGE_S) return null;
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (isAdmin !== true) return null;
    return { email: user.email ?? "admin", mode: "supabase" };
  }
  const session = await verifySession((await cookies()).get(LOCAL_SESSION_COOKIE)?.value);
  return session?.mfa ? { email: session.sub, mode: "local" } : null;
}

/** Call at the top of every admin page / server action / admin API (defence in depth on top of middleware). */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) redirect("/admin/prijava");
  return s;
}
