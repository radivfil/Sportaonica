import { NextResponse } from "next/server";
import { contactSchema, fieldErrors, looksAutomated } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { repo } from "@/lib/data";
import { sendEmail } from "@/lib/email/send";
import { ownerContactEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`contact:${ip}`, 5, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false, message: "Previše poruka. Pokušajte kasnije." }, { status: 429 });

  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, message: "Provjerite označena polja.", fieldErrors: errors }, { status: 422 });
  }
  const d = parsed.data;
  if (looksAutomated(d.startedAt)) return NextResponse.json({ ok: false, message: "Poslano prebrzo, pokušajte ponovno." }, { status: 429 });
  if (!(await verifyTurnstile(d.turnstileToken, ip))) return NextResponse.json({ ok: false, message: "Potvrdite da niste robot." }, { status: 400 });

  const msg = await repo().createContactMessage({ name: d.name, email: d.email, phone: d.phone || undefined, message: d.message });
  const settings = await repo().getSettings();
  await sendEmail({ to: process.env.OWNER_NOTIFICATION_EMAIL || settings.email, ...ownerContactEmail(msg, settings), replyTo: d.email });
  return NextResponse.json({ ok: true });
}
