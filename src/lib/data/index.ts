import "server-only";
import path from "node:path";
import os from "node:os";
import type { Repository } from "./repository";
import { JsonRepository } from "./json-repo";
import { SupabaseRepository } from "./supabase-repo";

export type { Repository } from "./repository";
export * from "./types";

declare global {
  var __sportaonicaRepo: Repository | undefined;
}

export function dataDir(): string {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  // Vercel's filesystem is read-only except /tmp (ephemeral — demo only!)
  if (process.env.VERCEL) return path.join(os.tmpdir(), "sportaonica-data");
  return path.resolve(process.cwd(), ".data");
}

export function isSupabase() {
  return process.env.DATA_PROVIDER === "supabase" && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** Single repository instance per server process. */
export function repo(): Repository {
  if (!globalThis.__sportaonicaRepo) {
    globalThis.__sportaonicaRepo = isSupabase()
      ? new SupabaseRepository(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, process.env.SUPABASE_STORAGE_BUCKET || "uploads")
      : new JsonRepository(dataDir());
  }
  return globalThis.__sportaonicaRepo;
}
