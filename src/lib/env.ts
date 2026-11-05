/**
 * Environment & project phase. See .env.demo / .env.production and README.
 *
 *  APP_ENV=local       developer machine; JSON file store unless SUPABASE_URL is set
 *  APP_ENV=demo        Phase A: Supabase Free + Cloudflare Free, fictional data, "DEMO" marker
 *  APP_ENV=production  Phase B: Supabase Pro (EU) owned by the client
 *
 * Moving A → B is env-only: new SUPABASE_* keys, APP_ENV=production, run migrations.
 */
export type AppEnv = "local" | "demo" | "production";

export const APP_ENV: AppEnv = ((): AppEnv => {
  const v = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
  return v === "demo" || v === "production" ? v : "local";
})();

export const IS_PRODUCTION = APP_ENV === "production";

/** The small "DEMO" marker on every page (public env so it is known at build time). */
export const SHOW_DEMO_MARKER = (process.env.NEXT_PUBLIC_APP_ENV ?? "local") !== "production";

export const supabaseConfig = () => ({
  url: process.env.SUPABASE_URL ?? "",
  anonKey: process.env.SUPABASE_ANON_KEY ?? "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  bucket: process.env.SUPABASE_STORAGE_BUCKET || "uploads",
});

export function usesSupabase(): boolean {
  const c = supabaseConfig();
  const on = !!(c.url && c.anonKey);
  if (!on && APP_ENV !== "local") throw new Error(`APP_ENV=${APP_ENV} requires SUPABASE_URL and SUPABASE_ANON_KEY`);
  return on;
}

/** Long random secret for local admin sessions & cron endpoints. */
export function requiredSecret(name: "AUTH_SECRET" | "CRON_SECRET"): string {
  const v = process.env[name];
  if (v && v.length >= 32) return v;
  if (APP_ENV !== "local") throw new Error(`${name} must be set (min. 32 characters) when APP_ENV=${APP_ENV}`);
  return `local-dev-only-${name}-not-secret-000000`;
}
