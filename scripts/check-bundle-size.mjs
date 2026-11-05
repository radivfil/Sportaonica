// Measures the gzip size of the Cloudflare Worker (after `npm run cf:build`).
// Workers Free: 3 MiB compressed. Workers Paid ($5/month): 10 MiB.
//   node scripts/check-bundle-size.mjs
import { execSync } from "node:child_process";

const FREE_LIMIT_KIB = 3072;
const WARN_KIB = 2900;

const out = execSync("npx wrangler deploy --dry-run --outdir .wrangler/dry", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const m = out.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/);
if (!m) {
  console.error("Could not read the bundle size from wrangler output:\n" + out);
  process.exit(2);
}
const gzip = Number(m[2]);
console.log(`Worker bundle: ${m[1]} KiB raw, ${gzip} KiB gzip (Free limit ${FREE_LIMIT_KIB} KiB)`);
if (gzip > FREE_LIMIT_KIB) {
  console.error("✖ Bundle exceeds the Workers Free limit → switch to Workers Paid ($5/month), see README → Troškovi.");
  process.exit(1);
}
if (gzip > WARN_KIB) console.warn("⚠ Bundle is close to the Free limit.");
