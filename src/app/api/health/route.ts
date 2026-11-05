import { NextResponse } from "next/server";
import { publicRepo } from "@/lib/data";
import { APP_ENV } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Uptime check (UptimeRobot, every 5 min). Runs a real query (`select 1` via
 * the health_check RPC). In the demo phase this also keeps the free Supabase
 * project from being paused for inactivity.
 */
export async function GET() {
  const started = Date.now();
  try {
    await publicRepo().health();
    return NextResponse.json({ status: "ok", db: "ok", env: APP_ENV, ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("health check failed", err);
    return NextResponse.json({ status: "error", db: "unreachable", env: APP_ENV }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
