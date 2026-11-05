/**
 * Signed session cookie for the LOCAL admin login (APP_ENV=local only).
 * Edge-compatible (Web Crypto) so middleware and server code share it.
 */
export const LOCAL_SESSION_COOKIE = "sp_admin";
export const SESSION_MAX_AGE_S = 60 * 60 * 8; // 8 h absolute
export const PRE_MFA_MAX_AGE_S = 60 * 5; // 5 min to enter the 2FA code

const enc = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  return "local-dev-only-AUTH_SECRET-not-secret-000000";
}

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface LocalSession {
  sub: string;
  exp: number;
  /** true after the TOTP step */
  mfa: boolean;
}

export async function signSession(sub: string, mfa: boolean): Promise<string> {
  const ttl = mfa ? SESSION_MAX_AGE_S : PRE_MFA_MAX_AGE_S;
  const payload = b64url(enc.encode(JSON.stringify({ sub, mfa, exp: Math.floor(Date.now() / 1000) + ttl })));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token: string | undefined): Promise<LocalSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as LocalSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}
