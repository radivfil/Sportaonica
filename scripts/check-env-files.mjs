// Fails if a committed env template contains something that looks like a real secret.
// Secrets belong in Cloudflare (wrangler secret put), GitHub Actions secrets or .env.local.
import { readFileSync, existsSync } from "node:fs";

const FILES = [".env.example", "env/.env.demo", "env/.env.production"];
const SECRET_KEYS = /^(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|RESEND_API_KEY|AUTH_SECRET|CRON_SECRET|TURNSTILE_SECRET_KEY|ADMIN_PASSWORD|ADMIN_TOTP_SECRET|SUPABASE_DB_URL|R2_SECRET_ACCESS_KEY|AGE_SECRET_KEY)$/;
const LOOKS_SECRET = /(eyJ[A-Za-z0-9_-]{20,}|sb_secret_|sb_publishable_|re_[A-Za-z0-9]{16,}|postgres(ql)?:\/\/[^:]+:[^@<]+@|AGE-SECRET-KEY-)/;

let bad = 0;
for (const f of FILES) {
  if (!existsSync(f)) continue;
  readFileSync(f, "utf8")
    .split(/\r?\n/)
    .forEach((line, i) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) return;
      const [, k, v] = m;
      const val = v.replace(/^["']|["']$/g, "");
      if ((SECRET_KEYS.test(k) && val && !/^<.*>$/.test(val)) || LOOKS_SECRET.test(val)) {
        console.error(`✖ ${f}:${i + 1} ${k} looks like a real secret. Use a <placeholder> and set the value in the secret store.`);
        bad++;
      }
    });
}
if (bad) process.exit(1);
console.log("✔ env templates contain no secrets");
