import { NextResponse } from "next/server";
import { registrationSchema, fieldErrors, looksAutomated } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { cancelUrl, createPublicRegistration } from "@/lib/booking";
import { repo } from "@/lib/data";
import { waitlistPosition } from "@/lib/data/stats";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`reg:${ip}`, 8, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Previše pokušaja. Pričekajte nekoliko minuta ili nas nazovite." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST", message: "Neispravan zahtjev." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) {
      // honeypot hit: pretend success, store nothing
      return NextResponse.json({ ok: true, spam: true });
    }
    return NextResponse.json({ ok: false, code: "VALIDATION", message: "Provjerite označena polja.", fieldErrors: errors }, { status: 422 });
  }
  const data = parsed.data;

  if (looksAutomated(data.startedAt)) {
    return NextResponse.json({ ok: false, code: "TOO_FAST", message: "Obrazac je poslan prebrzo. Pokušajte ponovno." }, { status: 429 });
  }
  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, code: "CAPTCHA", message: "Potvrdite da niste robot." }, { status: 400 });
  }

  const result = await createPublicRegistration(data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message, fieldErrors: result.fieldErrors }, { status: result.status });
  }

  const reg = result.registration;
  const all = reg.status === "waitlist" ? await repo().listRegistrations({ slotId: reg.slotId }) : [];
  return NextResponse.json({
    ok: true,
    registration: { id: reg.id, status: reg.status, childName: reg.childName, email: reg.email },
    slot: result.slot,
    waitlistPosition: reg.status === "waitlist" ? waitlistPosition(all, reg) : null,
    // Demo only: e-mails go to the console, so expose the cancel link on screen.
    demoCancelUrl: process.env.RESEND_API_KEY ? undefined : cancelUrl(reg),
  });
}
