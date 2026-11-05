/**
 * Static DESIGN PREVIEW of the public site for GitHub Pages (fictional data only).
 *
 *   npm run build:pages            -> ./out-pages  (publish to the gh-pages branch)
 *
 * GitHub Pages cannot run a server, so the site is built with
 * NEXT_PUBLIC_STATIC_DEMO=1 (forms are simulated, server-side filters hidden,
 * admin not published), started locally on the fictional JSON seed, crawled
 * into HTML files and combined with the static assets.
 * The real site (bookings, admin, e-mails) runs on Cloudflare Workers + Supabase.
 */
import { spawn, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.env.PAGES_REPO || "Sportaonica";
const OWNER = process.env.PAGES_OWNER || "radivfil";
const BASE = `/${REPO}`;
const PORT = 3300;
const OUT = path.resolve("out-pages");
const NEXT_BIN = path.resolve("node_modules/next/dist/bin/next");
const env = {
  ...process.env,
  APP_ENV: "local",
  NEXT_PUBLIC_APP_ENV: "demo", // DEMO marker + noindex
  NEXT_PUBLIC_STATIC_DEMO: "1",
  NEXT_PUBLIC_BASE_PATH: BASE,
  NEXT_PUBLIC_SITE_URL: `https://${OWNER.toLowerCase()}.github.io${BASE}`,
  DATA_DIR: ".data/pages",
  RATE_LIMIT_DISABLED: "1",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};

rmSync(".data/pages", { recursive: true, force: true });
console.log("› next build (static preview)…");
// The preview needs no middleware (no admin/API is published, Pages sends no CSP) and with
// basePath Next 15 serves an EMPTY home page when middleware matches the basePath root.
const MW = "src/middleware.ts";
const MW_AWAY = "src/middleware.ts.pages-build";
if (existsSync(MW_AWAY)) renameSync(MW_AWAY, MW); // recover from an interrupted run
renameSync(MW, MW_AWAY);
try {
  execFileSync(process.execPath, [NEXT_BIN, "build"], { stdio: "inherit", env });
} finally {
  renameSync(MW_AWAY, MW);
}

console.log("› starting server…");
const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], { env, stdio: "ignore" });
const origin = `http://localhost:${PORT}`;
const get = (p) => fetch(origin + p, { redirect: "manual" });
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${origin}${BASE}/api/health/`)).ok) break;
  } catch {}
  if (i > 120) {
    server.kill();
    throw new Error("server did not start");
  }
  await new Promise((r) => setTimeout(r, 500));
}

try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const sitemap = await (await get(`${BASE}/sitemap.xml`)).text();
  const pages = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(BASE, "") || "/"))];
  for (const p of pages) {
    const url = `${BASE}${p === "/" ? "/" : p.replace(/\/?$/, "/")}`;
    const res = await fetch(origin + url); // follow redirects (basePath root)
    const html = await res.text();
    // never publish an empty or broken page
    if (!res.ok || html.length < 2000 || !html.includes("</html>")) throw new Error(`${url} -> ${res.status}, ${html.length} bytes`);
    const file = path.join(OUT, p, "index.html");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html);
    console.log("  ✓", url);
  }
  writeFileSync(path.join(OUT, "404.html"), await (await get(`${BASE}/ova-stranica-ne-postoji/`)).text());
  for (const f of ["robots.txt", "sitemap.xml", "manifest.webmanifest", "opengraph-image"]) {
    const res = await get(`${BASE}/${f}`);
    if (res.ok) writeFileSync(path.join(OUT, f), Buffer.from(await res.arrayBuffer()));
  }
  cpSync(".next/static", path.join(OUT, "_next/static"), { recursive: true });
  cpSync("public", OUT, { recursive: true });
  writeFileSync(path.join(OUT, ".nojekyll"), ""); // keep the _next folder
  console.log(`\n✔ Static preview in ${OUT}: ${pages.length} pages`);
} finally {
  server.kill();
}
