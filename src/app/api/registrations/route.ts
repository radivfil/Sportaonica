import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/validation";
import { guardPublicForm } from "@/lib/public-form";
import { createPublicRegistration } from "@/lib/booking";

export const dynamic = "force-dynamic";

/** Public booking. One participant → one slot or several sessions of a series (atomic). */
export async function POST(req: Request) {
  const g = await guardPublicForm(req, registrationSchema, "reg", 8, 600);
  if (!g.ok) return g.response;
  const result = await createPublicRegistration(g.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message, fieldErrors: result.fieldErrors }, { status: result.status });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
