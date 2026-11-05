import "server-only";
import { createHash } from "node:crypto";
import { publicRepo } from "./data";

/**
 * Rate limiting shared by every server instance (Cloudflare runs many
 * isolates, so in-memory counters are not enough): counters live in the
 * database (`rate_limit_hit` RPC). IPs are hashed with a daily salt, so no raw
 * IP addresses are stored.
 */
export async function rateLimit(scope: string, ip: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  if (process.env.RATE_LIMIT_DISABLED === "1" && process.env.APP_ENV !== "production") return { ok: true, retryAfter: 0 };
  const day = new Date().toISOString().slice(0, 10);
  const key = `${scope}:${createHash("sha256").update(`${day}|${ip}|${process.env.AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32)}`;
  try {
    const ok = await publicRepo().rateLimitHit(key, limit, windowSeconds);
    return { ok, retryAfter: ok ? 0 : windowSeconds };
  } catch (err) {
    console.error("rate limit check failed", err);
    return { ok: true, retryAfter: 0 }; // fail open: never block a parent because of a limiter error
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
