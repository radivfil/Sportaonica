import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/** Call at the top of every admin server action / page. Defence in depth on top of middleware. */
export async function requireAdmin() {
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/prijava");
  return session;
}

export async function isAdmin() {
  const store = await cookies();
  return !!(await verifySessionToken(store.get(SESSION_COOKIE)?.value));
}
