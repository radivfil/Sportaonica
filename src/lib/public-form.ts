import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientIp, rateLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";
import { fieldErrors, looksAutomated } from "./validation";

type Guarded<T> = { ok: true; data: T; ip: string } | { ok: false; response: Response };

/**
 * Shared protection for public POST endpoints: rate limit → JSON body → zod →
 * honeypot → minimum fill time → optional Cloudflare Turnstile.
 * CSRF: middleware rejects cross-origin POSTs; JSON bodies also force a CORS preflight.
 */
export async function guardPublicForm<S extends z.ZodType>(
  req: Request,
  schema: S,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<Guarded<z.output<S>>> {
  const ip = clientIp(req.headers);
  const rl = await rateLimit(scope, ip, limit, windowSeconds);
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: "Previše pokušaja. Pričekajte nekoliko minuta ili nas nazovite." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      ),
    };
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: NextResponse.json({ ok: false, code: "BAD_REQUEST", message: "Neispravan zahtjev." }, { status: 415 }) };
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // honeypot hit: pretend success, store nothing
    if (errors.website) return { ok: false, response: NextResponse.json({ ok: true, spam: true }) };
    return { ok: false, response: NextResponse.json({ ok: false, code: "VALIDATION", message: "Provjerite označena polja.", fieldErrors: errors }, { status: 422 }) };
  }
  const data = parsed.data as z.output<S> & { startedAt?: number; turnstileToken?: string };
  if (looksAutomated(data.startedAt)) {
    return { ok: false, response: NextResponse.json({ ok: false, code: "TOO_FAST", message: "Obrazac je poslan prebrzo. Pokušajte ponovno." }, { status: 429 }) };
  }
  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return { ok: false, response: NextResponse.json({ ok: false, code: "CAPTCHA", message: "Potvrdite da niste robot." }, { status: 400 }) };
  }
  return { ok: true, data, ip };
}
