/**
 * Owner authentication for /admin. Edge-compatible (Web Crypto only), so the
 * same verify() runs in middleware and in server actions.
 *
 * Demo: credentials from ADMIN_EMAIL / ADMIN_PASSWORD. When moving to
 * Supabase Auth, replace `checkCredentials` and keep the session cookie.
 */
export const SESSION_COOKIE = "sp_admin";
const MAX_AGE_S = 60 * 60 * 12; // 12 h

const enc = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return s || "dev-only-insecure-secret-change-me";
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface Session {
  sub: string;
  exp: number;
}

export async function createSessionToken(email: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ sub: email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S })));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(payload))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    return session.exp > Date.now() / 1000 ? session : null;
  } catch {
    return null;
  }
}

export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL || "vlasnik@sportaonica.hr").toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || "sportaonica-demo";
  // evaluate both to keep timing uniform
  const okEmail = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const okPassword = safeEqual(password, expectedPassword);
  return okEmail && okPassword;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_S,
};
