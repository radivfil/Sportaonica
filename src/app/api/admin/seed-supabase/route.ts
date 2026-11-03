import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { isSupabase, repo } from "@/lib/data";
import type { SupabaseRepository } from "@/lib/data/supabase-repo";

/** One-time: POST to copy demo data into an empty Supabase project. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabase()) return NextResponse.json({ error: "DATA_PROVIDER is not supabase" }, { status: 400 });
  const seeded = await (repo() as SupabaseRepository).seedIfEmpty();
  return NextResponse.json({ seeded });
}
