"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import type { FaqItem, Location, SiteSettings } from "@/lib/data/types";
import { requireAdmin } from "@/lib/admin-guard";
import { activitySchema, postSchema, slotSchema } from "@/lib/validation";
import { notifyPromoted } from "@/lib/booking";
import { sanitizePostHtml } from "@/lib/sanitize";
import { isAgeInRange } from "@/lib/age";

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
  return r.startsWith("/admin") ? r : fallback;
}

/* ---------------- activities ---------------- */
export async function saveActivity(fd: FormData) {
  await requireAdmin();
  const parsed = activitySchema.safeParse({
    id: str(fd, "id") || undefined,
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    ageMin: str(fd, "ageMin"),
    ageMax: str(fd, "ageMax"),
    icon: str(fd, "icon"),
    color: str(fd, "color"),
    status: bool(fd, "archived") ? "archived" : "active",
    order: str(fd, "order") || 0,
  });
  const self = `/admin/aktivnosti/${str(fd, "id") || "nova"}`;
  if (!parsed.success) fail(self, parsed.error.issues[0].message);
  await repo().saveActivity(parsed.data);
  done("/admin/aktivnosti", "Aktivnost je spremljena.");
}

export async function deleteActivity(fd: FormData) {
  await requireAdmin();
  try {
    await repo().deleteActivity(str(fd, "id"));
  } catch (e) {
    fail("/admin/aktivnosti", (e as Error).message);
  }
  done("/admin/aktivnosti", "Aktivnost je obrisana.");
}

/* ---------------- slots ---------------- */
export async function saveSlot(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id") || undefined;
  const parsed = slotSchema.safeParse({
    id,
    activityId: str(fd, "activityId"),
    locationId: str(fd, "locationId"),
    dayOfWeek: str(fd, "dayOfWeek"),
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime"),
    capacity: str(fd, "capacity"),
    preEnrolled: str(fd, "preEnrolled") || 0,
    status: bool(fd, "archived") ? "archived" : "active",
    note: str(fd, "note") || undefined,
  });
  if (!parsed.success) fail(`/admin/termini/${id ?? "novi"}`, parsed.error.issues[0].message);
  if (id) {
    const existing = await repo().getSlot(id);
    if (existing && parsed.data.capacity < existing.preEnrolled + existing.confirmedCount) {
      fail(`/admin/termini/${id}`, `Kapacitet ne može biti manji od broja upisanih (${existing.preEnrolled + existing.confirmedCount}).`);
    }
  }
  const slot = await repo().saveSlot(parsed.data as Parameters<ReturnType<typeof repo>["saveSlot"]>[0]);
  // more capacity → promote waitlist automatically (atomic in the repository)
  const promoted = await repo().promoteWaitlist(slot.id);
  for (const p of promoted) await notifyPromoted(p);
  done("/admin/termini", "Termin je spremljen.");
}

export async function duplicateSlot(fd: FormData) {
  await requireAdmin();
  const copy = await repo().duplicateSlot(str(fd, "id"));
  revalidatePath("/", "layout");
  redirect(`/admin/termini/${copy.id}?ok=${q("Termin je dupliciran — prilagodite dan i vrijeme.")}`);
}

export async function deleteSlot(fd: FormData) {
  await requireAdmin();
  try {
    await repo().deleteSlot(str(fd, "id"));
  } catch (e) {
    fail("/admin/termini", (e as Error).message);
  }
  done("/admin/termini", "Termin je obrisan.");
}

/* ---------------- registrations ---------------- */
function regInput(fd: FormData) {
  return {
    parentName: str(fd, "parentName"),
    phone: str(fd, "phone"),
    email: str(fd, "email").toLowerCase(),
    childName: str(fd, "childName"),
    childBirthDate: str(fd, "childBirthDate"),
    healthNote: str(fd, "healthNote") || undefined,
    source: str(fd, "source") || undefined,
    adminNote: str(fd, "adminNote") || undefined,
    marketingConsent: bool(fd, "marketingConsent"),
    paid: bool(fd, "paid"),
  };
}
function validateReg(d: ReturnType<typeof regInput>): string | null {
  if (d.parentName.length < 3) return "Upišite ime roditelja.";
  if (d.childName.length < 2) return "Upišite ime djeteta.";
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return "Neispravan e-mail.";
  if (d.phone.length < 6) return "Neispravan telefon.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.childBirthDate)) return "Upišite datum rođenja djeteta.";
  return null;
}

export async function createRegistration(fd: FormData) {
  await requireAdmin();
  const slotId = str(fd, "slotId");
  const d = regInput(fd);
  const err = validateReg(d) ?? (slotId ? null : "Odaberite termin.");
  if (err) fail("/admin/prijave/nova", err);
  const slot = await repo().getSlot(slotId);
  const act = slot ? await repo().getActivity(slot.activityId) : null;
  if (act && !bool(fd, "ignoreAge") && !isAgeInRange(d.childBirthDate, act.ageMin, act.ageMax)) {
    fail("/admin/prijave/nova", `Dob djeteta nije u rasponu ${act.ageMin}–${act.ageMax} god. Označite „Zanemari dob” ako ipak želite upisati.`);
  }
  const res = await repo().book(slotId, { ...d, slotId, gdprConsent: true }, { allowWaitlist: bool(fd, "waitlist"), force: bool(fd, "force") });
  if (!res.ok) fail("/admin/prijave/nova", res.code === "SLOT_FULL" ? "Termin je pun. Označite „Lista čekanja” ili „Upiši iznad kapaciteta”." : "Termin nije pronađen.");
  done("/admin/prijave", `Prijava za ${d.childName} je dodana (${res.registration.status === "waitlist" ? "lista čekanja" : "upisan/a"}).`);
}

export async function updateRegistration(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const d = regInput(fd);
  const err = validateReg(d);
  if (err) fail(`/admin/prijave/${id}`, err);
  await repo().updateRegistration(id, d);
  done(`/admin/prijave/${id}`, "Promjene su spremljene.");
}

export async function togglePaid(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const reg = await repo().getRegistration(id);
  if (reg) await repo().updateRegistration(id, { paid: !reg.paid });
  revalidatePath("/admin/prijave");
  redirect(back(fd, "/admin/prijave"));
}

export async function cancelRegistrationAdmin(fd: FormData) {
  await requireAdmin();
  const res = await repo().cancelRegistration(str(fd, "id"));
  await notifyPromoted(res.promoted);
  done(back(fd, "/admin/prijave"), res.promoted ? `Prijava otkazana. ${res.promoted.childName} je prebačen/a s liste čekanja.` : "Prijava je otkazana.");
}

export async function promoteRegistration(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const reg = await repo().getRegistration(id);
  if (!reg) fail("/admin/prijave", "Prijava ne postoji.");
  const slot = await repo().getSlot(reg.slotId);
  if (slot?.isFull && !bool(fd, "force")) fail(back(fd, "/admin/prijave"), "Termin je pun — nema slobodnog mjesta za prebacivanje.");
  const updated = await repo().updateRegistration(id, { status: "confirmed" });
  await notifyPromoted(updated);
  done(back(fd, "/admin/prijave"), `${reg.childName} je upisan/a u termin.`);
}

export async function moveRegistration(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const res = await repo().moveRegistration(id, str(fd, "targetSlotId"), { force: bool(fd, "force") });
  if (!res.ok) fail(`/admin/prijave/${id}`, res.code === "SLOT_FULL" ? "Ciljni termin je pun. Označite „Upiši iznad kapaciteta” ako ipak želite premjestiti." : "Termin nije pronađen.");
  await notifyPromoted(res.promoted);
  done(`/admin/prijave/${id}`, "Prijava je premještena.");
}

export async function deleteRegistration(fd: FormData) {
  await requireAdmin();
  await repo().deleteRegistration(str(fd, "id"));
  done("/admin/prijave", "Podaci su trajno obrisani (GDPR).");
}

/* ---------------- posts ---------------- */
export async function savePost(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id") || undefined;
  const parsed = postSchema.safeParse({
    id,
    title: str(fd, "title"),
    slug: str(fd, "slug"),
    excerpt: str(fd, "excerpt"),
    contentHtml: String(fd.get("contentHtml") ?? ""),
    coverImage: str(fd, "coverImage") || undefined,
    coverAlt: str(fd, "coverAlt") || undefined,
    status: str(fd, "status") === "published" ? "published" : "draft",
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
  });
  if (!parsed.success) fail(`/admin/novosti/${id ?? "nova"}`, parsed.error.issues[0].message);
  const existing = id ? await repo().getPost(id) : null;
  const post = await repo().savePost({ ...parsed.data, contentHtml: sanitizePostHtml(parsed.data.contentHtml), publishedAt: existing?.publishedAt });
  done(`/admin/novosti/${post.id}`, post.status === "published" ? "Objava je spremljena i objavljena." : "Skica je spremljena.");
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  await repo().deletePost(str(fd, "id"));
  done("/admin/novosti", "Objava je obrisana.");
}

/* ---------------- editable blocks ---------------- */
export async function saveFaq(fd: FormData) {
  await requireAdmin();
  const questions = fd.getAll("question").map(String);
  const answers = fd.getAll("answer").map(String);
  const ids = fd.getAll("faqId").map(String);
  const faq: FaqItem[] = questions
    .map((question, i) => ({ id: ids[i] || `faq-${Date.now()}-${i}`, question: question.trim(), answer: (answers[i] ?? "").trim() }))
    .filter((f) => f.question && f.answer);
  await repo().updateContent({ faq });
  done("/admin/sadrzaj#faq", "Pitanja su spremljena.");
}

export async function saveTrainer(fd: FormData) {
  await requireAdmin();
  await repo().updateContent({
    trainer: {
      name: str(fd, "name"),
      title: str(fd, "title"),
      bio: String(fd.get("bio") ?? "").trim(),
      highlights: str(fd, "highlights").split("\n").map((s) => s.trim()).filter(Boolean),
      photo: str(fd, "photo") || undefined,
    },
  });
  done("/admin/sadrzaj#trener", "Podaci o treneru su spremljeni.");
}

export async function savePricing(fd: FormData) {
  await requireAdmin();
  await repo().updateContent({ pricingNote: str(fd, "pricingNote") });
  done("/admin/sadrzaj#clanarina", "Tekst o članarini je spremljen.");
}

export async function saveLocation(fd: FormData) {
  await requireAdmin();
  const current = await repo().getLocation(str(fd, "id"));
  if (!current) fail("/admin/sadrzaj", "Lokacija ne postoji.");
  const loc: Location = {
    ...current,
    name: str(fd, "name") || current.name,
    venue: str(fd, "venue"),
    address: str(fd, "address"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    description: str(fd, "description"),
    mapUrl: str(fd, "mapUrl") || current.mapUrl,
    lat: Number(str(fd, "lat")) || current.lat,
    lng: Number(str(fd, "lng")) || current.lng,
  };
  await repo().saveLocation(loc);
  done(`/admin/sadrzaj#${loc.slug}`, `Lokacija ${loc.name} je spremljena.`);
}

/* ---------------- settings ---------------- */
export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const patch: Partial<SiteSettings> = {
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    instagramUrl: str(fd, "instagramUrl"),
    facebookUrl: str(fd, "facebookUrl"),
    bannerEnabled: bool(fd, "bannerEnabled"),
    bannerText: str(fd, "bannerText"),
    business: { name: str(fd, "businessName"), owner: str(fd, "businessOwner"), oib: str(fd, "oib"), address: str(fd, "businessAddress") },
  };
  if (!patch.phone || !patch.email) fail("/admin/postavke", "Telefon i e-mail su obavezni.");
  if (patch.business!.oib && !/^\d{11}$/.test(patch.business!.oib)) fail("/admin/postavke", "OIB mora imati 11 znamenki.");
  await repo().updateSettings(patch);
  done("/admin/postavke", "Postavke su spremljene.");
}
