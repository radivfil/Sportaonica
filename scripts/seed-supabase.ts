/**
 * Fills an EMPTY demo Supabase project with FICTIONAL data (phase A only).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… APP_ENV=demo npm run supabase:seed -- --yes
 *
 * Refuses to run when APP_ENV=production or when the project already has registrations.
 * In production you start with an empty catalogue and enter real programmes in the admin.
 */
import { createClient } from "@supabase/supabase-js";
import { createSeed } from "../src/lib/data/seed";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
if (process.env.APP_ENV === "production") throw new Error("Refusing to seed fictional data into PRODUCTION.");
if (!process.argv.includes("--yes")) {
  console.log(`This writes fictional demo data into ${url}. Re-run with --yes to continue.`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const must = <T>(r: { data: T; error: { message: string } | null }, what: string) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

const { count } = await db.from("registrations").select("id", { count: "exact", head: true });
if (count) throw new Error(`Project already has ${count} registrations, refusing to seed.`);

const s = createSeed();
must(await db.from("site_kv").upsert([{ key: "settings", value: s.settings }, { key: "content", value: s.content }]), "site_kv");
must(
  await db.from("locations").upsert(
    s.locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, venue: l.venue, address: l.address, postal_code: l.postalCode, city: l.city, lat: l.lat, lng: l.lng, map_url: l.mapUrl, description: l.description, hours: l.hours, sort_order: l.order })),
  ),
  "locations",
);
must(
  await db.from("activities").upsert(
    s.activities.map((a) => ({ id: a.id, slug: a.slug, name: a.name, audience: a.audience, short_description: a.shortDescription, description: a.description, age_min: a.ageMin, age_max: a.ageMax, with_parent: a.withParent, key_facts: a.keyFacts, icon: a.icon, color: a.color, status: a.status, sort_order: a.order })),
  ),
  "activities",
);
must(
  await db.from("slots").upsert(
    s.slots.map((x) => ({ id: x.id, activity_id: x.activityId, location_id: x.locationId, kind: x.kind, day_of_week: x.dayOfWeek, session_date: x.date ?? null, valid_from: x.validFrom ?? null, valid_to: x.validTo ?? null, series_id: x.seriesId ?? null, start_time: x.startTime, end_time: x.endTime, capacity: x.capacity, status: x.status })),
  ),
  "slots",
);
must(
  await db.from("posts").upsert(
    s.posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, content_html: p.contentHtml, cover_image: p.coverImage, cover_alt: p.coverAlt, images: p.images, status: p.status, published_at: p.publishedAt })),
    { onConflict: "slug" },
  ),
  "posts",
);
must(await db.from("gallery_images").insert(s.gallery.map((g) => ({ src: g.src, alt: g.alt, category: g.category, width: g.width, height: g.height, sort_order: g.order }))), "gallery");
// fictional registrations (no e-mails are queued for these)
const groups = new Map<string, string>();
const regs = s.registrations.map((r) => {
  if (!groups.has(r.groupId)) groups.set(r.groupId, crypto.randomUUID());
  return {
    slot_id: r.slotId,
    group_id: groups.get(r.groupId),
    status: r.status,
    parent_name: r.parentName,
    phone: r.phone,
    email: r.email,
    child_name: r.childName,
    child_birth_date: r.childBirthDate,
    health_note: r.healthNote ?? null,
    gdpr_consent: true,
    paid: r.paid,
    cancel_token_hash: r.cancelTokenHash,
    admin_note: r.adminNote ?? null,
    created_at: r.createdAt,
    cancelled_at: r.cancelledAt ?? null,
  };
});
must(await db.from("registrations").insert(regs), "registrations");
must(await db.from("inquiries").insert(s.inquiries.map((i) => ({ type: i.type, name: i.name, email: i.email, phone: i.phone, message: i.message, event_date: i.eventDate, children_count: i.childrenCount, child_age: i.childAge }))), "inquiries");
console.log(`✔ Seeded fictional demo data: ${s.activities.length} activities, ${s.slots.length} slots, ${regs.length} registrations.`);
