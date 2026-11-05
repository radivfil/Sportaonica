import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { guardPublicForm } from "@/lib/public-form";
import { publicRepo } from "@/lib/data";
import { dispatchOutbox } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guardPublicForm(req, contactSchema, "contact", 5, 600);
  if (!g.ok) return g.response;
  const d = g.data;
  const res = await publicRepo().createInquiry({ type: "contact", name: d.name, email: d.email, phone: d.phone || undefined, message: d.message });
  if (!res.ok) return NextResponse.json({ ok: false, message: "Provjerite unesene podatke." }, { status: 422 });
  await dispatchOutbox().catch((e) => console.error("dispatchOutbox", e));
  return NextResponse.json({ ok: true });
}
