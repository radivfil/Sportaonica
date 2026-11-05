import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "../env";

/**
 * Three Supabase clients, from least to most privileged. The browser never
 * talks to Supabase directly — all keys stay on the server.
 */

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

let anon: SupabaseClient | undefined;
/** Public website: anon key → RLS allows catalogue reads + booking/cancel RPCs only. */
export function anonClient(): SupabaseClient {
  const c = supabaseConfig();
  return (anon ??= createClient(c.url, c.anonKey, noSession));
}

let service: SupabaseClient | undefined;
/**
 * Service role (bypasses RLS). ONLY for server-side jobs: e-mail outbox,
 * retention, creating the admin user. Never import from client components.
 */
export function serviceClient(): SupabaseClient {
  const c = supabaseConfig();
  if (!c.serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return (service ??= createClient(c.url, c.serviceKey, noSession));
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** The admin's own session (cookies). Requests run as `authenticated` with the user's JWT. */
export async function sessionClient(): Promise<SupabaseClient> {
  const c = supabaseConfig();
  const store = await cookies();
  return createServerClient(c.url, c.anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS });
        } catch {
          // called from a Server Component: cookies are read-only there; middleware refreshes them
        }
      },
    },
  });
}
