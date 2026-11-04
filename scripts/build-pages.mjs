/**
 * Builds a static preview of the public site for GitHub Pages.
 *
 *   npm run build:pages            -> ./out-pages (upload/push to the gh-pages branch)
 *
 * GitHub Pages cannot run Node, so: the site is built with
 * NEXT_PUBLIC_STATIC_DEMO=1 (forms are simulated, admin hidden), served locally,
 * crawled into HTML files and combined with the static assets.
 * For the real site (bookings, admin, e-mails) deploy to Vercel instead.
 */
import { spawn, execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.env.PAGES_REPO || "Sportaonica";
const OWNER = process.env.PAGES_OWNER || "radivfil";
const BASE = `/${REPO}`;
const PORT = 3300;
const OUT = path.resolve("out-pages");
const env = {
  ...process.env,
  NEXT_PUBLIC_STATIC_DEMO: "1",
  NEXT_PUBLIC_BASE_PATH: BASE,
  NEXT_PUBLIC_SITE_URL: `https://${OWNER.toLowerCase()}.github.io${BASE}`,
  DATA_DIR: ".data/pages",
  RATE_LIMIT_DISABLED: "1",
};

rmSync(".data/pages", { recursive: true, force: true });
console.log("› next build (static preview)…");
execSync("npx next build", { stdio: "inherit", env });

console.log("› starting server…");
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: "ignore", detached: true });
const origin = `http://localhost:${PORT}`;
const get = (p) => fetch(origin + p);
for (let i = 0; ; i++) {
  try {
    if ((await get(`${BASE}/`)).ok) break;
  } catch {}
  if (i > 60) throw new Error("server did not start");
  await new Promise((r) => setTimeout(r, 500));
}

try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const sitemap = await (await get(`${BASE}/sitemap.xml`)).text();
  const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(BASE, "") || "/");
  for (const p of pages) {
    const url = `${BASE}${p === "/" ? "/" : p.replace(/\/?$/, "/")}`;
    const res = await get(url);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    const file = path.join(OUT, p, "index.html");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, await res.text());
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
  console.log(`\n✔ Static preview in ${OUT} — ${pages.length} pages`);
} finally {
  try {
    process.kill(-server.pid);
  } catch {}
}
