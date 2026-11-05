import { NextResponse } from "next/server";
import { publicRepo } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Public availability feed (no personal data): seats are computed from registrations. */
export async function GET() {
  const slots = await publicRepo().listSlots();
  return NextResponse.json(
    slots.map(({ id, remaining, capacity, isFull, waitlistCount, isPast }) => ({ id, remaining, capacity, isFull, waitlistCount, isPast })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
