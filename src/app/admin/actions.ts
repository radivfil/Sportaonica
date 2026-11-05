"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminRepo } from "@/lib/data";
import type { Activity, BirthdayPackage, FaqItem, GalleryCategory, ImageRef, Location, Person, SiteSettings, Slot } from "@/lib/data/types";
import { GALLERY_CATEGORIES } from "@/lib/data/types";
import { activitySchema, adminRegistrationSchema, postSchema, seriesSchema, slotSchema } from "@/lib/validation";
import { dispatchOutbox, hashToken, newCancelToken } from "@/lib/notifications";
import { sanitizePostHtml } from "@/lib/sanitize";
import { datesInRange, weekdayOf } from "@/lib/data/rules";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const q = (msg: string) => encodeURIComponent(msg);

function done(path: string, ok: string): never {
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}ok=${q(ok)}`);
}
function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${q(error)}`);
}
function back(fd: FormData, fallback: string) {
  const r = str(fd, "returnTo");
  return r.startsWith("/admin") && !r.startsWith("//") ? r : fallback;
}
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Nešto nije u redu.");
const sendMails = () => dispatchOutbox().catch((e) => console.error("dispatchOutbox", e));

const CODE_MSG: Record<string, string> = {
  SLOT_FULL: "Termin je pun. Označite „Lista čekanja” ili „Upiši iznad kapaciteta”.",
  SLOT_NOT_FOUND: "Termin nije pronađen.",
  SLOT_INACTIVE: "Termin je arhiviran ili je prošao. Označite „Upiši iznad kapaciteta” ako ipak želite upisati.",
  DUPLICATE: "Ovaj polaznik je već prijavljen u taj termin.",
  AGE_OUT_OF_RANGE: "Dob nije u rasponu aktivnosti. Označite „Zanemari dob” ako ipak želite upisati.",
  INVALID: "Provjerite podatke (e-mail, telefon, datum rođenja).",
};

/* ---------------- activities ---------------- */
function activityFromForm(fd: FormData) {
  return activitySchema.safeParse({
    id: str(fd, "id") || undefined,
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    audience: str(fd, "audience") === "adults" ? "adults" : "kids",
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    ageMin: str(fd, "ageMin"),
    ageMax: str(fd, "ageMax"),
    withParent: bool(fd, "withParent"),
    keyFacts: str(fd, "keyFacts")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    icon: str(fd, "icon"),
    color: str(fd, "color"),
    status: bool(fd, "archived") ? "archived" : "active",
    order: str(fd, "order") || 0,
  });
}

export async function saveActivity(fd: FormData) {
  const repo = await adminRepo();
  const parsed = activityFromForm(fd);
  const self = `/admin/aktivnosti/${str(fd, "id") || "nova"}`;
  if (!parsed.success) fail(self, parsed.error.issues[0].message);
  try {
    await repo.saveActivity(parsed.data as Omit<Activity, "id"> & { id?: string });
  } catch (e) {
    fail(self, errMsg(e));
  }
  done("/admin/aktivnosti", "Aktivnost je spremljena.");
}

export async function duplicateActivity(fd: FormData) {
  const repo = await adminRepo();
  const src = await repo.getActivity(str(fd, "id"));
  if (!src) fail("/admin/aktivnosti", "Aktivnost ne postoji.");
  const { id: _omit, ...rest } = src;
  void _omit;
  const copy = await repo.saveActivity({ ...rest, name: `${src.name} (kopija)`, slug: "", status: "archived", order: src.order + 1 });
  revalidatePath("/", "layout");
  redirect(`/admin/aktivnosti/${copy.id}?ok=${q("Aktivnost je kopirana (arhivirana). Prilagodite je i aktivirajte.")}`);
}

export async function deleteActivity(fd: FormData) {
  const repo = await adminRepo();
  try {
    await repo.deleteActivity(str(fd, "id"));
  } catch (e) {
    fail("/admin/aktivnosti", errMsg(e));
  }
  done("/admin/aktivnosti", "Aktivnost je obrisana.");
}

/* ---------------- slots ---------------- */
export async function saveSlot(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id") || undefined;
  const kind = str(fd, "kind") === "single" ? "single" : "weekly";
  const date = str(fd, "date");
  const parsed = slotSchema.safeParse({
    id,
    activityId: str(fd, "activityId"),
    locationId: str(fd, "locationId"),
    kind,
    dayOfWeek: kind === "single" && date ? weekdayOf(date) : str(fd, "dayOfWeek"),
    date: kind === "single" ? date : "",
    validFrom: kind === "weekly" ? str(fd, "validFrom") : "",
    validTo: kind === "weekly" ? str(fd, "validTo") : "",
    seriesId: str(fd, "seriesId") || undefined,
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime"),
    capacity: str(fd, "capacity"),
    status: bool(fd, "archived") ? "archived" : "active",
    note: str(fd, "note") || undefined,
  });
  const self = `/admin/termini/${id ?? "novi"}`;
  if (!parsed.success) fail(self, parsed.error.issues[0].message);
  try {
    await repo.saveSlots([parsed.data as Omit<Slot, "id"> & { id?: string }]);
  } catch (e) {
    fail(self, errMsg(e));
  }
  await sendMails(); // more capacity may have promoted waitlisted children
  done("/admin/termini", "Termin je spremljen.");
}

/** Generator: weekly groups for a season, or dated single sessions forming one series. */
export async function generateSlots(fd: FormData) {
  const repo = await adminRepo();
  const parsed = seriesSchema.safeParse({
    activityId: str(fd, "activityId"),
    locationId: str(fd, "locationId"),
    kind: str(fd, "kind") === "single" ? "single" : "weekly",
    days: fd.getAll("days").map(String),
    from: str(fd, "from"),
    to: str(fd, "to"),
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime"),
    capacity: str(fd, "capacity"),
  });
  if (!parsed.success) fail("/admin/termini/generator", parsed.error.issues[0].message);
  const d = parsed.data;
  const days = [...new Set(d.days)] as Slot["dayOfWeek"][];
  const base = { activityId: d.activityId, locationId: d.locationId, startTime: d.startTime, endTime: d.endTime, capacity: d.capacity, status: "active" as const };
  let slots: (Omit<Slot, "id">)[];
  if (d.kind === "weekly") {
    slots = days.map((day) => ({ ...base, kind: "weekly" as const, dayOfWeek: day, validFrom: d.from, validTo: d.to }));
  } else {
    const dates = datesInRange(d.from, d.to, days);
    if (!dates.length) fail("/admin/termini/generator", "U odabranom razdoblju nema odabranih dana.");
    if (dates.length > 60) fail("/admin/termini/generator", "Najviše 60 termina u jednoj seriji. Skratite razdoblje.");
    const seriesId = `serija-${crypto.randomUUID().slice(0, 8)}`;
    slots = dates.map((date) => ({ ...base, kind: "single" as const, dayOfWeek: weekdayOf(date), date, seriesId }));
  }
  try {
    await repo.saveSlots(slots);
  } catch (e) {
    fail("/admin/termini/generator", errMsg(e));
  }
  done("/admin/termini", `Napravljeno termina: ${slots.length}.`);
}

export async function duplicateSlot(fd: FormData) {
  const repo = await adminRepo();
  const src = await repo.getSlot(str(fd, "id"), { includeArchived: true });
  if (!src) fail("/admin/termini", "Termin ne postoji.");
  const copy: Omit<Slot, "id"> = {
    activityId: src.activityId,
    locationId: src.locationId,
    kind: src.kind,
    dayOfWeek: src.dayOfWeek,
    date: src.date,
    validFrom: src.validFrom,
    validTo: src.validTo,
    startTime: src.startTime,
    endTime: src.endTime,
    capacity: src.capacity,
    status: "archived",
    note: src.note,
  };
  const [saved] = await repo.saveSlots([copy]);
  revalidatePath("/", "layout");
  redirect(`/admin/termini/${saved.id}?ok=${q("Termin je kopiran (arhiviran). Prilagodite dan i vrijeme pa ga aktivirajte.")}`);
}

export async function deleteSlot(fd: FormData) {
  const repo = await adminRepo();
  try {
    await repo.deleteSlot(str(fd, "id"));
  } catch (e) {
    fail("/admin/termini", errMsg(e));
  }
  done("/admin/termini", "Termin je obrisan.");
}

/* ---------------- registrations ---------------- */
function regFromForm(fd: FormData) {
  return adminRegistrationSchema.safeParse({
    parentName: str(fd, "parentName"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    childName: str(fd, "childName"),
    childBirthDate: str(fd, "childBirthDate"),
    healthNote: str(fd, "healthNote") || undefined,
    adminNote: str(fd, "adminNote") || undefined,
    paid: bool(fd, "paid"),
  });
}

export async function createRegistration(fd: FormData) {
  const repo = await adminRepo();
  const slotIds = fd.getAll("slotId").map(String).filter(Boolean);
  const parsed = regFromForm(fd);
  if (!slotIds.length) fail("/admin/prijave/nova", "Odaberite termin.");
  if (!parsed.success) fail("/admin/prijave/nova", parsed.error.issues[0].message);
  const d = parsed.data;
  const token = newCancelToken();
  const res = await repo.book({
    slotIds,
    input: { parentName: d.parentName, phone: d.phone, email: d.email, childName: d.childName, childBirthDate: d.childBirthDate, healthNote: d.healthNote, gdprConsent: true },
    cancelTokenHash: hashToken(token),
    allowWaitlist: bool(fd, "waitlist"),
    admin: { force: bool(fd, "force"), ignoreAge: bool(fd, "ignoreAge"), paid: d.paid, adminNote: d.adminNote },
  });
  if (!res.ok) fail("/admin/prijave/nova", CODE_MSG[res.code] ?? res.code);
  await dispatchOutbox(new Map([[res.groupId, token]])).catch(() => undefined);
  const wait = res.registrations.some((r) => r.status === "waitlist");
  done("/admin/prijave", `Prijava za ${d.childName} je dodana${wait ? " (lista čekanja)" : ""}. Roditelj je dobio potvrdu e-mailom.`);
}

export async function updateRegistration(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id");
  const parsed = regFromForm(fd);
  if (!parsed.success) fail(`/admin/prijave/${id}`, parsed.error.issues[0].message);
  const d = parsed.data;
  await repo.updateRegistration(id, { ...d, healthNote: d.healthNote ?? "", adminNote: d.adminNote ?? "" });
  done(`/admin/prijave/${id}`, "Promjene su spremljene.");
}

export async function togglePaid(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id");
  const reg = await repo.getRegistration(id);
  if (reg) await repo.updateRegistration(id, { paid: !reg.paid });
  revalidatePath("/admin/prijave");
  redirect(back(fd, "/admin/prijave"));
}

export async function cancelRegistrationAdmin(fd: FormData) {
  const repo = await adminRepo();
  const res = await repo.cancelRegistrationAdmin(str(fd, "id"));
  if (!res.ok) fail(back(fd, "/admin/prijave"), "Prijava nije pronađena.");
  await sendMails();
  done(back(fd, "/admin/prijave"), res.promoted ? "Prijava je otkazana. Prvi s liste čekanja je upisan i dobio je e-mail." : "Prijava je otkazana.");
}

export async function promoteRegistration(fd: FormData) {
  const repo = await adminRepo();
  const res = await repo.promoteRegistration(str(fd, "id"), { force: bool(fd, "force") });
  if (!res.ok) fail(back(fd, "/admin/prijave"), res.code === "SLOT_FULL" ? "Termin je pun. Nema slobodnog mjesta za prebacivanje." : "Prijava nije pronađena.");
  await sendMails();
  done(back(fd, "/admin/prijave"), "Polaznik je upisan u termin i dobio je e-mail.");
}

export async function moveRegistration(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id");
  const res = await repo.moveRegistration(id, str(fd, "targetSlotId"), { force: bool(fd, "force") });
  if (!res.ok) fail(`/admin/prijave/${id}`, CODE_MSG[res.code] ?? "Premještanje nije uspjelo.");
  await sendMails();
  done(`/admin/prijave/${id}`, "Prijava je premještena.");
}

export async function anonymizeRegistration(fd: FormData) {
  const repo = await adminRepo();
  await repo.anonymizeRegistration(str(fd, "id"));
  await sendMails();
  done("/admin/prijave", "Osobni podaci su trajno obrisani (GDPR). Zapis o prijavi ostaje bez osobnih podataka.");
}

export async function runRetention() {
  const repo = await adminRepo();
  const n = await repo.purgeExpired();
  done("/admin/postavke", `Automatsko brisanje pokrenuto: anonimizirano prijava: ${n}.`);
}

/* ---------------- posts ---------------- */
export async function savePost(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id") || undefined;
  const srcs = fd.getAll("imageSrc").map(String);
  const alts = fd.getAll("imageAlt").map(String);
  const images: ImageRef[] = srcs.map((src, i) => ({ src: src.trim(), alt: (alts[i] ?? "").trim() })).filter((x) => x.src);
  const parsed = postSchema.safeParse({
    id,
    title: str(fd, "title"),
    slug: str(fd, "slug"),
    excerpt: str(fd, "excerpt"),
    contentHtml: String(fd.get("contentHtml") ?? ""),
    coverImage: str(fd, "coverImage") || undefined,
    coverAlt: str(fd, "coverAlt") || undefined,
    images,
    status: str(fd, "status") === "published" ? "published" : "draft",
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
  });
  if (!parsed.success) fail(`/admin/novosti/${id ?? "nova"}`, parsed.error.issues[0].message);
  if (parsed.data.coverImage && !parsed.data.coverAlt) fail(`/admin/novosti/${id ?? "nova"}`, "Naslovna slika treba opis (alternativni tekst).");
  const existing = id ? await repo.getPost(id) : null;
  const post = await repo.savePost({ ...parsed.data, contentHtml: sanitizePostHtml(parsed.data.contentHtml), publishedAt: existing?.publishedAt });
  done(`/admin/novosti/${post.id}`, post.status === "published" ? "Objava je spremljena i objavljena." : "Skica je spremljena.");
}

export async function deletePost(fd: FormData) {
  const repo = await adminRepo();
  await repo.deletePost(str(fd, "id"));
  done("/admin/novosti", "Objava je obrisana.");
}

/* ---------------- gallery ---------------- */
const toCategory = (v: string): GalleryCategory => ((GALLERY_CATEGORIES as readonly string[]).includes(v) ? (v as GalleryCategory) : "treninzi");

/** Adds freshly uploaded images (alt text required for each). */
export async function addGalleryImages(fd: FormData) {
  const repo = await adminRepo();
  const srcs = fd.getAll("src").map(String);
  const alts = fd.getAll("alt").map((a) => String(a).trim());
  const widths = fd.getAll("width").map(Number);
  const heights = fd.getAll("height").map(Number);
  const category = toCategory(str(fd, "category"));
  if (!srcs.length) fail("/admin/galerija", "Najprije odaberite slike.");
  if (alts.some((a) => a.length < 3)) fail("/admin/galerija", "Svaka slika mora imati opis (alternativni tekst) od barem 3 znaka.");
  const existing = await repo.listGallery();
  let order = existing.reduce((m, g) => Math.max(m, g.order), 0);
  for (const [i, src] of srcs.entries()) {
    if (!/^(https:\/\/|\/api\/uploads\/)/.test(src)) continue;
    await repo.saveGalleryImage({ src, alt: alts[i], category, width: widths[i] || 1200, height: heights[i] || 900, order: ++order });
  }
  done("/admin/galerija", `Dodano slika: ${srcs.length}.`);
}

export async function updateGalleryImage(fd: FormData) {
  const repo = await adminRepo();
  const id = str(fd, "id");
  const img = (await repo.listGallery()).find((g) => g.id === id);
  if (!img) fail("/admin/galerija", "Slika ne postoji.");
  const alt = str(fd, "alt");
  if (alt.length < 3) fail("/admin/galerija", "Opis slike (alternativni tekst) je obavezan.");
  await repo.saveGalleryImage({ ...img, alt, category: toCategory(str(fd, "category")) });
  done("/admin/galerija", "Slika je spremljena.");
}

export async function deleteGalleryImage(fd: FormData) {
  const repo = await adminRepo();
  await repo.deleteGalleryImage(str(fd, "id"));
  done("/admin/galerija", "Slika je uklonjena iz galerije.");
}

/** Called from the drag-and-drop list. */
export async function reorderGallery(ids: string[]) {
  const repo = await adminRepo();
  await repo.reorderGallery(ids.filter((x) => typeof x === "string").slice(0, 1000));
  revalidatePath("/galerija");
  revalidatePath("/admin/galerija");
}

/* ---------------- editable blocks ---------------- */
export async function saveFaq(fd: FormData) {
  const repo = await adminRepo();
  const questions = fd.getAll("question").map(String);
  const answers = fd.getAll("answer").map(String);
  const ids = fd.getAll("faqId").map(String);
  const faq: FaqItem[] = questions
    .map((question, i) => ({ id: ids[i] || `faq-${crypto.randomUUID().slice(0, 8)}`, question: question.trim(), answer: (answers[i] ?? "").trim() }))
    .filter((f) => f.question && f.answer);
  await repo.updateContent({ faq });
  done("/admin/sadrzaj#faq", "Pitanja su spremljena.");
}

export async function saveAbout(fd: FormData) {
  const repo = await adminRepo();
  const ids = fd.getAll("personId").map(String);
  const names = fd.getAll("personName").map(String);
  const roles = fd.getAll("personRole").map(String);
  const bios = fd.getAll("personBio").map(String);
  const highlights = fd.getAll("personHighlights").map(String);
  const photos = fd.getAll("personPhoto").map(String);
  const photoAlts = fd.getAll("personPhotoAlt").map(String);
  const people: Person[] = names
    .map((name, i) => ({
      id: ids[i] || `person-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      role: (roles[i] ?? "").trim(),
      bio: (bios[i] ?? "").trim(),
      highlights: (highlights[i] ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      photo: (photos[i] ?? "").trim() || undefined,
      photoAlt: (photoAlts[i] ?? "").trim() || undefined,
    }))
    .filter((p) => p.name);
  if (people.some((p) => p.photo && !p.photoAlt)) fail("/admin/sadrzaj#o-nama", "Svaka fotografija treba opis (alternativni tekst).");
  await repo.updateContent({ about: { heading: str(fd, "heading"), intro: String(fd.get("intro") ?? "").trim(), people } });
  done("/admin/sadrzaj#o-nama", "Stranica „O nama” je spremljena.");
}

export async function saveBirthdays(fd: FormData) {
  const repo = await adminRepo();
  const ids = fd.getAll("pkgId").map(String);
  const names = fd.getAll("pkgName").map(String);
  const descs = fd.getAll("pkgDescription").map(String);
  const prices = fd.getAll("pkgPrice").map(String);
  const packages: BirthdayPackage[] = names
    .map((name, i) => ({ id: ids[i] || `pkg-${crypto.randomUUID().slice(0, 8)}`, name: name.trim(), description: (descs[i] ?? "").trim(), priceNote: (prices[i] ?? "").trim() }))
    .filter((p) => p.name);
  await repo.updateContent({ birthdays: { intro: String(fd.get("intro") ?? "").trim(), packages } });
  done("/admin/sadrzaj#rodendani", "Rođendani su spremljeni.");
}

export async function savePricing(fd: FormData) {
  const repo = await adminRepo();
  await repo.updateContent({ pricingNote: str(fd, "pricingNote") });
  done("/admin/sadrzaj#clanarina", "Tekst o članarini je spremljen.");
}

export async function saveLocation(fd: FormData) {
  const repo = await adminRepo();
  const current = await repo.getLocation(str(fd, "id"));
  if (!current) fail("/admin/postavke", "Lokacija ne postoji.");
  const loc: Location = {
    ...current,
    name: str(fd, "name") || current.name,
    venue: str(fd, "venue"),
    address: str(fd, "address"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    description: str(fd, "description"),
    hours: String(fd.get("hours") ?? "").trim(),
    mapUrl: /^https:\/\//.test(str(fd, "mapUrl")) ? str(fd, "mapUrl") : current.mapUrl,
    lat: Number(str(fd, "lat")) || current.lat,
    lng: Number(str(fd, "lng")) || current.lng,
  };
  await repo.saveLocation(loc);
  done(`/admin/postavke#${loc.slug}`, `Lokacija ${loc.name} je spremljena.`);
}

/* ---------------- settings ---------------- */
export async function saveSettings(fd: FormData) {
  const repo = await adminRepo();
  const url = (k: string) => {
    const v = str(fd, k);
    return v && !/^https:\/\//.test(v) ? null : v;
  };
  const patch: Partial<SiteSettings> = {
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    instagramUrl: url("instagramUrl") ?? "",
    facebookUrl: url("facebookUrl") ?? "",
    bannerEnabled: bool(fd, "bannerEnabled"),
    bannerText: str(fd, "bannerText").slice(0, 160),
    cancelDeadlineHours: Math.min(168, Math.max(0, Number(str(fd, "cancelDeadlineHours")) || 0)),
    retentionMonths: Math.min(120, Math.max(1, Number(str(fd, "retentionMonths")) || 24)),
    business: { name: str(fd, "businessName"), owner: str(fd, "businessOwner"), oib: str(fd, "oib"), address: str(fd, "businessAddress") },
  };
  if (!patch.phone || !/^\S+@\S+\.\S+$/.test(patch.email ?? "")) fail("/admin/postavke", "Telefon i ispravan e-mail su obavezni.");
  if (url("instagramUrl") === null || url("facebookUrl") === null) fail("/admin/postavke", "Poveznice na društvene mreže moraju počinjati s https://");
  if (patch.business!.oib && !/^\d{11}$/.test(patch.business!.oib)) fail("/admin/postavke", "OIB mora imati 11 znamenki.");
  await repo.updateSettings(patch);
  done("/admin/postavke", "Postavke su spremljene.");
}

/* ---------------- inquiries ---------------- */
export async function toggleInquiryHandled(fd: FormData) {
  const repo = await adminRepo();
  await repo.setInquiryHandled(str(fd, "id"), !bool(fd, "handled"));
  revalidatePath("/admin/upiti");
  redirect(back(fd, "/admin/upiti"));
}
