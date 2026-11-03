import { NextResponse } from "next/server";
import { repo } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Public availability feed (no personal data). */
export async function GET() {
  const slots = await repo().listSlots();
  return NextResponse.json(
    slots.map(({ id, remaining, taken, capacity, isFull, waitlistCount }) => ({ id, remaining, taken, capacity, isFull, waitlistCount })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
