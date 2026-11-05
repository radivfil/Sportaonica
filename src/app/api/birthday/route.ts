import { NextResponse } from "next/server";
import { birthdaySchema } from "@/lib/validation";
import { guardPublicForm } from "@/lib/public-form";
import { publicRepo } from "@/lib/data";
import { dispatchOutbox } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Birthday party inquiry → admin "Upiti" (type: birthday). */
export async function POST(req: Request) {
  const g = await guardPublicForm(req, birthdaySchema, "birthday", 5, 600);
  if (!g.ok) return g.response;
  const d = g.data;
  const res = await publicRepo().createInquiry({
    type: "birthday",
    name: d.name,
    email: d.email,
    phone: d.phone,
    message: d.message ?? "",
    eventDate: d.eventDate,
    childrenCount: d.childrenCount,
    childAge: d.childAge,
  });
  if (!res.ok) return NextResponse.json({ ok: false, message: "Provjerite unesene podatke." }, { status: 422 });
  await dispatchOutbox().catch((e) => console.error("dispatchOutbox", e));
  return NextResponse.json({ ok: true });
}
