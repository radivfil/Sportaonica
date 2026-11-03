import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // dismiss cookie banner
  await page.addInitScript(() => localStorage.setItem("sp-consent-v1", JSON.stringify({ necessary: true, analytics: false, date: "e2e" })));
});

test("home page shows hero, trust badge and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("zdrave navike");
  await expect(page.getByText("Verificirano od Ministarstva znanosti, obrazovanja i mladih").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Prijavi dijete/ }).first()).toBeVisible();
  // FAQ accordion toggles
  const q = page.getByRole("button", { name: "Što dijete treba ponijeti na trening?" });
  await q.click();
  await expect(q).toHaveAttribute("aria-expanded", "true");
});

test("parent books a slot, gets confirmation and can cancel via personal link", async ({ page }) => {
  await page.goto("/upisi");
  await page.getByRole("radio", { name: /Univerzalna sportska škola/ }).click();
  await page.getByRole("radio", { name: /Brckovljani/ }).click();
  await expect(page.getByText(/Još \d+ slobodn/).first()).toBeVisible();
  await page.getByRole("button", { name: /Odaberi termin/ }).first().click();

  await page.fill("#parentName", "Ivana Testić");
  await page.fill("#phone", "091 234 5678");
  await page.fill("#email", "ivana.e2e@example.com");
  await page.fill("#childName", "Luka Testić");
  // pick a birth date that is 7 years ago (program is 5–10)
  const d = new Date();
  d.setFullYear(d.getFullYear() - 7);
  await page.fill("#childBirthDate", d.toISOString().slice(0, 10));
  await page.check('input[name="gdprConsent"]');
  await page.waitForTimeout(2600); // anti-bot minimum fill time
  await page.getByRole("button", { name: "Pošalji prijavu" }).click();

  await expect(page.getByTestId("confirmation-title")).toHaveText("Prijava je zaprimljena!");
  const cancelHref = await page.getByTestId("demo-cancel-link").getAttribute("href");
  expect(cancelHref).toContain("/otkazivanje/");

  await page.goto(new URL(cancelHref!).pathname);
  await expect(page.getByRole("heading", { name: "Otkazati prijavu?" })).toBeVisible();
  await page.getByRole("button", { name: "Da, otkaži prijavu" }).click();
  await expect(page.getByRole("heading", { name: "Prijava je otkazana" })).toBeVisible();
});

test("full slot offers the waitlist", async ({ page }) => {
  await page.goto("/upisi?aktivnost=igre-s-loptom&lokacija=bozjakovina");
  await expect(page.getByText("Popunjeno").first()).toBeVisible();
  await page.getByRole("button", { name: "Upis na listu čekanja" }).click();
  await expect(page.getByRole("heading", { name: /Podaci za listu čekanja/ })).toBeVisible();
});

test("age outside the programme range is rejected", async ({ page }) => {
  await page.goto("/upisi?termin=slot-06", { waitUntil: "networkidle" }); // Igre s loptom 3–5
  await page.fill("#childBirthDate", "2012-01-01");
  await expect(page.getByText(/namijenjen je djeci od 3 do 5 godina/)).toBeVisible();
});

test("admin requires login and shows the dashboard", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/prijava/);
  await page.fill("#email", "vlasnik@sportaonica.hr");
  await page.fill("#password", "sportaonica-demo");
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page.getByRole("heading", { name: /Dobar dan/ })).toBeVisible();
  await page.goto("/admin/prijave?status=waitlist");
  await expect(page.getByText("Luka Kovačević")).toBeVisible();
});
