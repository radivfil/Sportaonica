import { expect, test, type Page } from "@playwright/test";
import { totp } from "../../src/lib/auth/totp";

export const ADMIN = { email: "vlasnica@sportaonica.test", password: "e2e-lozinka-dovoljno-duga", totp: "JBSWY3DPEHPK3PXP" };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sp-consent-v1", JSON.stringify({ necessary: true, analytics: false, date: "e2e" })));
});

const yearsAgo = (y: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};

async function seats(page: Page, slotId: string) {
  const res = await page.request.get("/api/slots");
  const list = (await res.json()) as { id: string; remaining: number }[];
  return list.find((s) => s.id === slotId)?.remaining;
}

async function fillChild(page: Page, opts: { child: string; age: number; email?: string }) {
  await page.fill("#parentName", "Ivana Testić");
  await page.fill("#phone", "091 234 5678");
  await page.fill("#email", opts.email ?? "ivana.e2e@example.com");
  await page.fill("#childName", opts.child);
  await page.fill("#childBirthDate", yearsAgo(opts.age));
  await page.check('input[name="gdprConsent"]');
  await page.waitForTimeout(2600); // anti-bot minimum fill time
}

test("home: two locations, programmes for kids and adults, DEMO marker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("zdrave navike");
  await expect(page.getByRole("heading", { name: "Programi za djecu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Programi za odrasle" })).toBeVisible();
  await expect(page.getByRole("note", { name: /Demo verzija/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Božjakovin");
});

test("timetable rows: free seats and full sessions with waitlist", async ({ page }) => {
  await page.goto("/aktivnosti");
  const rows = page.getByTestId("session-row");
  await expect(rows.filter({ hasText: /Još \d+ slobodn/ }).first()).toBeVisible();
  const full = rows.filter({ hasText: "Popunjeno" }).first();
  await expect(full.getByRole("link", { name: /Lista čekanja/ })).toBeVisible();
  // filter: adults only
  await page.getByRole("link", { name: "Programi za odrasle" }).click();
  await expect(page.getByRole("heading", { name: "Pilates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mini Sportaonica" })).toHaveCount(0);
});

test("parent books, seats drop by one, cancels via personal link, seat is freed", async ({ page }) => {
  const before = await seats(page, "slot-04");
  await page.goto("/aktivnosti#univerzalna-sportska-skola");
  await page.locator("#univerzalna-sportska-skola").getByRole("link", { name: /^Prijavi:/ }).first().click();
  await expect(page).toHaveURL(/\/upisi\?termin=/);
  await fillChild(page, { child: "Luka Testić", age: 8 });
  await page.getByRole("button", { name: "Pošalji prijavu" }).click();

  await expect(page.getByTestId("confirmation-title")).toHaveText("Prijava je zaprimljena!");
  const slotId = new URL(page.url()).searchParams.get("termin")!;
  if (slotId === "slot-04") expect(await seats(page, "slot-04")).toBe(before! - 1);
  const cancelHref = await page.getByTestId("demo-cancel-link").getAttribute("href");
  expect(cancelHref).toContain("/otkazivanje/");

  await page.goto(new URL(cancelHref!).pathname);
  await expect(page.getByRole("heading", { name: /Moja prijava: Luka Testić/ })).toBeVisible();
  await page.getByRole("button", { name: "Da, otkaži prijavu" }).click();
  await expect(page.getByRole("status")).toContainText("Otkazano: 1");
  if (slotId === "slot-04") expect(await seats(page, "slot-04")).toBe(before);
});

test("duplicate booking of the same child is refused", async ({ page }) => {
  for (const attempt of [1, 2]) {
    await page.goto("/upisi?termin=slot-09");
    await fillChild(page, { child: "Dupli Duplić", age: 8 });
    await page.getByRole("button", { name: "Pošalji prijavu" }).click();
    if (attempt === 1) await expect(page.getByTestId("confirmation-title")).toBeVisible();
    else await expect(page.locator("main [role=alert]")).toContainText("već prijavljen");
  }
});

test("whole series with one submit", async ({ page }) => {
  await page.goto("/upisi?termin=slot-rol-1&serija=1");
  await expect(page.getByRole("radio", { name: /Cijela serija: 6 termina/ })).toBeChecked();
  await fillChild(page, { child: "Rita Rolerić", age: 7 });
  await page.getByRole("button", { name: "Pošalji prijavu" }).click();
  await expect(page.getByTestId("confirmation-title")).toBeVisible();
  await expect(page.getByText("Upisano", { exact: true })).toHaveCount(6);
});

test("full slot goes straight to the waitlist form", async ({ page }) => {
  await page.goto("/upisi?termin=slot-02&cekanje=1");
  await expect(page.getByRole("heading", { name: "Podaci za listu čekanja" })).toBeVisible();
  await fillChild(page, { child: "Mia Čekić", age: 5 });
  await page.getByRole("button", { name: "Upiši na listu čekanja" }).click();
  await expect(page.getByTestId("confirmation-title")).toHaveText("Na listi ste čekanja!");
});

test("age outside the programme range is rejected (per activity)", async ({ page }) => {
  await page.goto("/upisi?termin=slot-01"); // Mini Sportaonica 2–3
  await page.fill("#childBirthDate", yearsAgo(8));
  await expect(page.getByText(/namijenjen je dobi: 2–3 god\./)).toBeVisible();
});

test("birthday inquiry reaches the admin", async ({ page }) => {
  await page.goto("/rodendani");
  const future = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  await page.fill("#b-eventDate", future);
  await page.fill("#b-childrenCount", "14");
  await page.fill("#b-childAge", "6");
  await page.fill("#b-name", "Rođendanka Testić");
  await page.fill("#b-phone", "091 555 6666");
  await page.fill("#b-email", "rodjendan@example.com");
  await page.check('input[name="privacy"]');
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /Pošalji upit/ }).click();
  await expect(page.getByTestId("birthday-sent")).toBeVisible();

  await adminLogin(page);
  await page.goto("/admin/upiti?tip=birthday");
  await expect(page.getByText("Rođendanka Testić")).toBeVisible();
});

test("admin area: anonymous access blocked, login needs password + 2FA", async ({ page }) => {
  expect((await page.request.get("/api/admin/export", { maxRedirects: 0 })).status()).toBe(401);
  await page.goto("/admin/prijave");
  await expect(page).toHaveURL(/\/admin\/prijava/);
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.getByRole("button", { name: "Dalje" }).click();
  await expect(page).toHaveURL(/\/admin\/prijava\/2fa/);
  // still no access before the 2FA step
  expect((await page.request.get("/api/admin/export", { maxRedirects: 0 })).status()).toBe(401);
  await page.fill("#code", "000000");
  await page.getByRole("button", { name: "Potvrdi i uđi" }).click();
  await expect(page.locator("main p[role=alert]")).toContainText("Kod nije ispravan");
  await page.fill("#code", await totp(ADMIN.totp));
  await page.getByRole("button", { name: "Potvrdi i uđi" }).click();
  await expect(page.getByRole("heading", { name: /Prijave/ })).toBeVisible();
  await page.goto("/admin/prijave?status=waitlist");
  await expect(page.getByRole("link", { name: /Detalji/ }).first()).toBeVisible();
  const csv = await page.request.get("/api/admin/export?format=excel");
  expect(csv.status()).toBe(200);
  expect((await csv.body()).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  await page.goto("/admin/dnevnik");
  await expect(page.getByRole("cell", { name: "Izvoz prijava" }).first()).toBeVisible();
});

async function adminLogin(page: Page) {
  await page.goto("/admin/prijava");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.getByRole("button", { name: "Dalje" }).click();
  await page.fill("#code", await totp(ADMIN.totp));
  await page.getByRole("button", { name: "Potvrdi i uđi" }).click();
  await expect(page.getByRole("heading", { name: /Dobar dan/ })).toBeVisible();
}

for (const width of [360, 768, 1280]) {
  test(`no horizontal overflow or clipped buttons at ${width}px (long Croatian words)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", "/aktivnosti", "/upisi?termin=slot-dugo", "/upisi?termin=slot-rol-1&serija=1", "/rodendani", "/lokacije", "/o-nama"]) {
      await page.goto(url);
      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
        document.querySelectorAll<HTMLElement>("main a.btn-primary, main a.btn-secondary, main a.btn-navy, main button, main h1, main h2, main h3, main [data-testid=session-row]").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width <= 1 || getComputedStyle(el).visibility === "hidden" || el.closest("[aria-hidden=true], .sr-only")) return;
          if (r.right > vw + 1 || r.left < -1) out.push(`${el.tagName} "${el.textContent?.trim().slice(0, 40)}" outside viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto") out.push(`${el.tagName} "${el.textContent?.trim().slice(0, 40)}" clipped (${el.scrollWidth} > ${el.clientWidth})`);
        });
        return out;
      });
      expect(problems, `${url} @ ${width}px`).toEqual([]);
    }
  });
}
