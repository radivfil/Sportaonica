import "server-only";
import path from "node:path";
import type { Repository } from "./repository";
import { JsonRepository } from "./json-repo";
import { SupabaseRepository } from "./supabase-repo";
import { supabaseConfig, usesSupabase } from "../env";
import { anonClient, serviceClient, sessionClient } from "../supabase/clients";
import { requireAdmin } from "../auth/admin";

export type { Repository } from "./repository";
export * from "./types";

declare global {
  var __sportaonicaJson: JsonRepository | undefined;
}

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR || path.join(process.cwd(), ".data"));
}

function json(): JsonRepository {
  return (globalThis.__sportaonicaJson ??= new JsonRepository(dataDir(), "sustav", true));
}

/** Public website. Supabase: anon key, so RLS lets it read only public data. */
export function publicRepo(): Repository {
  return usesSupabase() ? new SupabaseRepository(anonClient(), supabaseConfig().bucket) : json().as("javno (roditelj)", false);
}

/** Owner area. Verifies the admin session (2FA) and runs with the owner's own JWT. */
export async function adminRepo(): Promise<Repository> {
  const session = await requireAdmin();
  return usesSupabase() ? new SupabaseRepository(await sessionClient(), supabaseConfig().bucket) : json().as(session.email, true);
}

/** Server-only jobs (e-mail outbox, retention). Supabase: service role. */
export function systemRepo(): Repository {
  return usesSupabase() ? new SupabaseRepository(serviceClient(), supabaseConfig().bucket) : json().as("sustav", true);
}

/** Test helper: reset the local JSON store. */
export function jsonStore(): JsonRepository {
  return json();
}
