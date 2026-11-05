/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30 s) with Web Crypto — used for the
 * local/dev admin login. Production uses Supabase Auth MFA (also TOTP).
 */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("Invalid base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

export async function hotp(secret: Uint8Array, counter: number, digits = 6): Promise<string> {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export async function totp(secretB32: string, at = Date.now(), step = 30): Promise<string> {
  return hotp(base32Decode(secretB32), Math.floor(at / 1000 / step));
}

/** Accepts the current code and ±1 step (clock drift). Constant-time compare. */
export async function verifyTotp(secretB32: string, code: string, at = Date.now()): Promise<boolean> {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  let ok = false;
  for (const drift of [-1, 0, 1]) {
    const expected = await totp(secretB32, at + drift * 30_000);
    let diff = 0;
    for (let i = 0; i < 6; i++) diff |= expected.charCodeAt(i) ^ c.charCodeAt(i);
    ok = ok || diff === 0;
  }
  return ok;
}

export function otpauthUri(secretB32: string, account: string, issuer = "Sportaonica admin") {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}`;
}
