import { NextResponse } from "next/server";
import { systemRepo } from "@/lib/data";
import { requiredSecret } from "@/lib/env";
import { dispatchOutbox } from "@/lib/notifications";
import { safeEqual } from "@/lib/auth/local-session";

export const dynamic = "force-dynamic";

/**
 * Periodic jobs, called every 5 minutes by a second UptimeRobot monitor
 * (…/api/cron/tick?key=CRON_SECRET) or `Authorization: Bearer CRON_SECRET`:
 *  - retry e-mails left in the outbox (Resend outage, daily quota)
 *  - once a day (03:00–03:05 UTC): anonymise registrations older than the retention period
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key") ?? "";
  if (!safeEqual(given, requiredSecret("CRON_SECRET"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outbox = await dispatchOutbox();
  let purged: number | null = null;
  const now = new Date();
  if (url.searchParams.get("purge") === "1" || (now.getUTCHours() === 3 && now.getUTCMinutes() < 5)) {
    purged = await systemRepo().purgeExpired();
  }
  return NextResponse.json({ ok: true, outbox, purged }, { headers: { "Cache-Control": "no-store" } });
}
