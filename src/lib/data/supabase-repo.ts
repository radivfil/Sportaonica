import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminResult, Repository, TokenRegistration } from "./repository";
import type {
  Activity,
  AuditEntry,
  BookingRequest,
  BookingResult,
  CancelResult,
  GalleryImage,
  Inquiry,
  Location,
  NewInquiry,
  OutboxItem,
  Post,
  PostStatus,
  Registration,
  RegistrationFilter,
  SiteContent,
  SiteSettings,
  Slot,
  SlotWithStats,
  Upload,
} from "./types";
import { slugify } from "../slug";

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? undefined : String(v));
const hm = (v: unknown) => String(v ?? "").slice(0, 5);

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

// ---------- row mappers ----------
const toLocation = (r: Row): Location => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  venue: String(r.venue ?? ""),
  address: String(r.address ?? ""),
  postalCode: String(r.postal_code ?? ""),
  city: String(r.city ?? ""),
  lat: Number(r.lat),
  lng: Number(r.lng),
  mapUrl: String(r.map_url ?? ""),
  description: String(r.description ?? ""),
  hours: String(r.hours ?? ""),
  order: Number(r.sort_order ?? 0),
});
const fromLocation = (l: Location): Row => ({
  id: l.id,
  slug: l.slug,
  name: l.name,
  venue: l.venue,
  address: l.address,
  postal_code: l.postalCode,
  city: l.city,
  lat: l.lat,
  lng: l.lng,
  map_url: l.mapUrl,
  description: l.description,
  hours: l.hours,
  sort_order: l.order,
});

const toActivity = (r: Row): Activity => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  audience: r.audience === "adults" ? "adults" : "kids",
  shortDescription: String(r.short_description ?? ""),
  description: String(r.description ?? ""),
  ageMin: Number(r.age_min),
  ageMax: r.age_max == null ? null : Number(r.age_max),
  withParent: !!r.with_parent,
  keyFacts: (r.key_facts as string[]) ?? [],
  icon: r.icon as Activity["icon"],
  color: r.color as Activity["color"],
  status: r.status as Activity["status"],
  order: Number(r.sort_order ?? 0),
});
const fromActivity = (a: Omit<Activity, "id"> & { id?: string }): Row => ({
  ...(a.id ? { id: a.id } : {}),
  slug: a.slug,
  name: a.name,
  audience: a.audience,
  short_description: a.shortDescription,
  description: a.description,
  age_min: a.ageMin,
  age_max: a.ageMax,
  with_parent: a.withParent,
  key_facts: a.keyFacts,
  icon: a.icon,
  color: a.color,
  status: a.status,
  sort_order: a.order,
});

const toSlot = (r: Row): SlotWithStats => {
  const capacity = Number(r.capacity);
  const activeCount = Number(r.active_count ?? 0);
  const remaining = Math.max(0, capacity - activeCount);
  return {
    id: String(r.id),
    activityId: String(r.activity_id),
    locationId: String(r.location_id),
    kind: r.kind === "single" ? "single" : "weekly",
    dayOfWeek: Number(r.day_of_week) as Slot["dayOfWeek"],
    date: s(r.session_date),
    validFrom: s(r.valid_from),
    validTo: s(r.valid_to),
    seriesId: s(r.series_id),
    startTime: hm(r.start_time),
    endTime: hm(r.end_time),
    capacity,
    status: r.status as Slot["status"],
    note: s(r.note),
    activeCount,
    waitlistCount: Number(r.waitlist_count ?? 0),
    remaining,
    isFull: remaining === 0,
    isPast: !!r.is_past,
  };
};
const fromSlot = (x: Omit<Slot, "id"> & { id?: string }): Row => ({
  ...(x.id ? { id: x.id } : {}),
  activity_id: x.activityId,
  location_id: x.locationId,
  kind: x.kind,
  day_of_week: x.dayOfWeek,
  session_date: x.kind === "single" ? x.date : null,
  valid_from: x.kind === "weekly" ? (x.validFrom ?? null) : null,
  valid_to: x.kind === "weekly" ? (x.validTo ?? null) : null,
  series_id: x.seriesId ?? null,
  start_time: x.startTime,
  end_time: x.endTime,
  capacity: x.capacity,
  status: x.status,
  note: x.note ?? null,
});

const toRegistration = (r: Row): Registration => ({
  id: String(r.id),
  slotId: String(r.slot_id),
  groupId: String(r.group_id),
  status: r.status as Registration["status"],
  parentName: String(r.parent_name),
  phone: String(r.phone),
  email: String(r.email),
  childName: String(r.child_name),
  childBirthDate: String(r.child_birth_date ?? ""),
  healthNote: s(r.health_note),
  gdprConsent: !!r.gdpr_consent,
  paid: !!r.paid,
  cancelTokenHash: String(r.cancel_token_hash),
  adminNote: s(r.admin_note),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  cancelledAt: s(r.cancelled_at),
  promotedAt: s(r.promoted_at),
  anonymizedAt: s(r.anonymized_at),
});

const toPost = (r: Row): Post => ({
  id: String(r.id),
  slug: String(r.slug),
  title: String(r.title),
  excerpt: String(r.excerpt ?? ""),
  contentHtml: String(r.content_html ?? ""),
  coverImage: s(r.cover_image),
  coverAlt: s(r.cover_alt),
  images: (r.images as Post["images"]) ?? [],
  status: r.status as PostStatus,
  publishedAt: s(r.published_at),
  seoTitle: s(r.seo_title),
  seoDescription: s(r.seo_description),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toGallery = (r: Row): GalleryImage => ({
  id: String(r.id),
  src: String(r.src),
  alt: String(r.alt),
  category: r.category as GalleryImage["category"],
  width: Number(r.width),
  height: Number(r.height),
  order: Number(r.sort_order ?? 0),
  createdAt: String(r.created_at),
});

const toInquiry = (r: Row): Inquiry => ({
  id: String(r.id),
  type: r.type as Inquiry["type"],
  name: String(r.name),
  email: String(r.email),
  phone: s(r.phone),
  message: String(r.message ?? ""),
  eventDate: s(r.event_date),
  childrenCount: r.children_count == null ? undefined : Number(r.children_count),
  childAge: r.child_age == null ? undefined : Number(r.child_age),
  handled: !!r.handled,
  createdAt: String(r.created_at),
});

const toOutbox = (r: Row): OutboxItem => ({
  id: String(r.id),
  kind: r.kind as OutboxItem["kind"],
  refId: String(r.ref_id),
  attempts: Number(r.attempts),
  lastError: s(r.last_error),
  createdAt: String(r.created_at),
  sentAt: s(r.sent_at),
});

/**
 * Supabase-backed repository. Whatever client is passed in decides the
 * privileges — the database (RLS + SECURITY DEFINER functions) enforces them.
 */
export class SupabaseRepository implements Repository {
  constructor(
    private readonly db: SupabaseClient,
    private readonly bucket = "uploads",
  ) {}

  // ---------- settings / content ----------
  private async kv<T>(key: "settings" | "content"): Promise<T> {
    const data = check(await this.db.from("site_kv").select("value").eq("key", key).maybeSingle());
    if (!data) throw new Error(`site_kv.${key} missing — run scripts/seed-supabase.mjs`);
    return data.value as T;
  }
  private async putKv<T extends object>(key: "settings" | "content", patch: Partial<T>): Promise<T> {
    const next = { ...(await this.kv<T>(key)), ...patch };
    check(await this.db.from("site_kv").upsert({ key, value: next, updated_at: new Date().toISOString() }));
    return next;
  }
  getSettings() {
    return this.kv<SiteSettings>("settings");
  }
  updateSettings(patch: Partial<SiteSettings>) {
    return this.putKv<SiteSettings>("settings", patch);
  }
  getContent() {
    return this.kv<SiteContent>("content");
  }
  updateContent(patch: Partial<SiteContent>) {
    return this.putKv<SiteContent>("content", patch);
  }

  // ---------- locations ----------
  async listLocations() {
    return check(await this.db.from("locations").select("*").order("sort_order")).map(toLocation);
  }
  async getLocation(idOrSlug: string) {
    const rows = check(await this.db.from("locations").select("*").or(`id.eq.${quote(idOrSlug)},slug.eq.${quote(idOrSlug)}`).limit(1));
    return rows[0] ? toLocation(rows[0]) : null;
  }
  async saveLocation(location: Location) {
    check(await this.db.from("locations").upsert(fromLocation(location)));
    return location;
  }

  // ---------- activities ----------
  async listActivities(opts: { includeArchived?: boolean } = {}) {
    let q = this.db.from("activities").select("*").order("sort_order");
    if (!opts.includeArchived) q = q.eq("status", "active");
    return check(await q).map(toActivity);
  }
  async getActivity(idOrSlug: string) {
    const rows = check(await this.db.from("activities").select("*").or(`id.eq.${quote(idOrSlug)},slug.eq.${quote(idOrSlug)}`).limit(1));
    return rows[0] ? toActivity(rows[0]) : null;
  }
  async saveActivity(input: Omit<Activity, "id"> & { id?: string }) {
    const row = fromActivity({ ...input, slug: input.slug || slugify(input.name) });
    const data = check(await this.db.from("activities").upsert(row).select("*").single());
    return toActivity(data);
  }
  async deleteActivity(id: string) {
    const { count } = await this.db.from("slots").select("id", { count: "exact", head: true }).eq("activity_id", id);
    if (count) throw new Error("Aktivnost ima termine. Arhivirajte je umjesto brisanja.");
    check(await this.db.from("activities").delete().eq("id", id));
  }

  // ---------- slots ----------
  async listSlots(opts: { includeArchived?: boolean } = {}) {
    return check(await this.db.rpc("list_slots", { p_include_archived: !!opts.includeArchived })).map(toSlot);
  }
  async getSlot(id: string, opts: { includeArchived?: boolean } = {}) {
    return (await this.listSlots(opts)).find((x: SlotWithStats) => x.id === id) ?? null;
  }
  async saveSlots(inputs: (Omit<Slot, "id"> & { id?: string })[]) {
    const out: Slot[] = [];
    for (const input of inputs) {
      const data = check(await this.db.from("slots").upsert(fromSlot(input)).select("*").single());
      out.push(toSlot(data));
    }
    return out;
  }
  async deleteSlot(id: string) {
    check(await this.db.from("slots").delete().eq("id", id));
  }

  // ---------- registrations: admin ----------
  async listRegistrations(filter: RegistrationFilter = {}) {
    let q = this.db.from("registrations").select("*, slots!inner(activity_id, location_id)").order("created_at", { ascending: false }).limit(5000);
    if (filter.slotId) q = q.eq("slot_id", filter.slotId);
    if (filter.groupId) q = q.eq("group_id", filter.groupId);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.activityId) q = q.eq("slots.activity_id", filter.activityId);
    if (filter.locationId) q = q.eq("slots.location_id", filter.locationId);
    if (filter.q) {
      const term = `%${filter.q.replace(/[%_,()]/g, " ").trim()}%`;
      q = q.or(`parent_name.ilike.${quote(term)},child_name.ilike.${quote(term)},email.ilike.${quote(term)},phone.ilike.${quote(term)}`);
    }
    return check(await q).map(toRegistration);
  }
  async getRegistration(id: string) {
    const data = check(await this.db.from("registrations").select("*").eq("id", id).maybeSingle());
    return data ? toRegistration(data) : null;
  }
  async updateRegistration(id: string, patch: Parameters<Repository["updateRegistration"]>[1]) {
    const row: Row = {};
    if (patch.parentName !== undefined) row.parent_name = patch.parentName;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.childName !== undefined) row.child_name = patch.childName;
    if (patch.childBirthDate !== undefined) row.child_birth_date = patch.childBirthDate;
    if (patch.healthNote !== undefined) row.health_note = patch.healthNote || null;
    if (patch.paid !== undefined) row.paid = patch.paid;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote || null;
    check(await this.db.from("registrations").update(row).eq("id", id));
  }
  private async adminRpc(fn: string, args: Row): Promise<AdminResult> {
    const r = check(await this.db.rpc(fn, args)) as { ok: boolean; code?: string; promoted?: number };
    return r.ok ? { ok: true, promoted: r.promoted } : { ok: false, code: r.code ?? "ERROR" };
  }
  cancelRegistrationAdmin(id: string) {
    return this.adminRpc("admin_cancel_registration", { p_id: id });
  }
  moveRegistration(id: string, target: string, opts: { force?: boolean } = {}) {
    return this.adminRpc("admin_move_registration", { p_id: id, p_target: target, p_force: !!opts.force });
  }
  promoteRegistration(id: string, opts: { force?: boolean } = {}) {
    return this.adminRpc("admin_promote_registration", { p_id: id, p_force: !!opts.force });
  }
  async anonymizeRegistration(id: string) {
    check(await this.db.rpc("anonymize_registration", { p_id: id }));
  }
  async purgeExpired() {
    return Number(check(await this.db.rpc("purge_expired_registrations")));
  }

  // ---------- registrations: public ----------
  async book(req: BookingRequest): Promise<BookingResult> {
    const r = check(
      await this.db.rpc("book_registration", {
        p_slot_ids: req.slotIds,
        p_payload: req.input,
        p_token_hash: req.cancelTokenHash,
        p_allow_waitlist: req.allowWaitlist,
        p_options: req.admin ?? {},
      }),
    ) as BookingResult;
    return r;
  }
  async registrationsByToken(token: string) {
    return check(await this.db.rpc("registrations_by_token", { p_token: token })) as TokenRegistration[];
  }
  async cancelByToken(token: string, ids?: string[]): Promise<CancelResult> {
    const r = check(await this.db.rpc("cancel_by_token", { p_token: token, p_ids: ids ?? null })) as CancelResult;
    return { cancelled: r.cancelled ?? [], tooLate: r.tooLate ?? [], promoted: r.promoted ?? 0 };
  }

  // ---------- posts ----------
  async listPosts(opts: { status?: PostStatus; limit?: number } = {}) {
    let q = this.db.from("posts").select("*").order("published_at", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.limit) q = q.limit(opts.limit);
    return check(await q).map(toPost);
  }
  async getPost(id: string) {
    const data = check(await this.db.from("posts").select("*").eq("id", id).maybeSingle());
    return data ? toPost(data) : null;
  }
  async getPostBySlug(slug: string) {
    const data = check(await this.db.from("posts").select("*").eq("slug", slug).maybeSingle());
    return data ? toPost(data) : null;
  }
  async savePost(input: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    let slug = slugify(input.slug || input.title) || `objava-${Date.now()}`;
    for (let i = 2; ; i++) {
      const clash = check(await this.db.from("posts").select("id").eq("slug", slug).maybeSingle());
      if (!clash || clash.id === input.id) break;
      slug = `${slugify(input.slug || input.title)}-${i}`;
    }
    const now = new Date().toISOString();
    const row: Row = {
      ...(input.id ? { id: input.id } : {}),
      slug,
      title: input.title,
      excerpt: input.excerpt,
      content_html: input.contentHtml,
      cover_image: input.coverImage ?? null,
      cover_alt: input.coverAlt ?? null,
      images: input.images,
      status: input.status,
      published_at: input.status === "published" ? (input.publishedAt ?? now) : (input.publishedAt ?? null),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      updated_at: now,
    };
    return toPost(check(await this.db.from("posts").upsert(row).select("*").single()));
  }
  async deletePost(id: string) {
    check(await this.db.from("posts").delete().eq("id", id));
  }

  // ---------- gallery ----------
  async listGallery() {
    return check(await this.db.from("gallery_images").select("*").order("sort_order").order("created_at")).map(toGallery);
  }
  async saveGalleryImage(img: Omit<GalleryImage, "id" | "createdAt"> & { id?: string }) {
    const row: Row = { ...(img.id ? { id: img.id } : {}), src: img.src, alt: img.alt, category: img.category, width: img.width, height: img.height, sort_order: img.order };
    return toGallery(check(await this.db.from("gallery_images").upsert(row).select("*").single()));
  }
  async deleteGalleryImage(id: string) {
    check(await this.db.from("gallery_images").delete().eq("id", id));
  }
  async reorderGallery(ids: string[]) {
    for (const [i, id] of ids.entries()) check(await this.db.from("gallery_images").update({ sort_order: i + 1 }).eq("id", id));
  }

  // ---------- inquiries ----------
  async createInquiry(inquiry: NewInquiry) {
    const r = check(await this.db.rpc("create_inquiry", { p_payload: inquiry })) as { ok: boolean };
    return { ok: !!r.ok };
  }
  async listInquiries() {
    return check(await this.db.from("inquiries").select("*").order("created_at", { ascending: false }).limit(1000)).map(toInquiry);
  }
  async getInquiry(id: string) {
    const data = check(await this.db.from("inquiries").select("*").eq("id", id).maybeSingle());
    return data ? toInquiry(data) : null;
  }
  async setInquiryHandled(id: string, handled: boolean) {
    check(await this.db.from("inquiries").update({ handled }).eq("id", id));
  }

  // ---------- audit ----------
  async audit(action: AuditEntry["action"], entityId?: string, details?: string) {
    check(await this.db.rpc("log_audit", { p_action: action, p_entity_id: entityId ?? null, p_details: details ?? null }));
  }
  async listAudit(limit = 200) {
    const rows = check(await this.db.from("audit_log").select("*").order("id", { ascending: false }).limit(limit));
    return rows.map((r: Row) => ({
      id: String(r.id),
      at: String(r.at),
      actor: String(r.actor),
      action: r.action as AuditEntry["action"],
      entityId: s(r.entity_id),
      details: s(r.details),
    }));
  }

  // ---------- system ----------
  async claimOutbox(limit = 20) {
    return (check(await this.db.rpc("claim_outbox", { p_limit: limit })) as Row[]).map(toOutbox);
  }
  async finishOutbox(id: string, error?: string, retryAt?: Date) {
    check(await this.db.rpc("finish_outbox", { p_id: id, p_error: error ?? null, p_retry_at: retryAt?.toISOString() ?? null }));
  }
  async rotateGroupToken(groupId: string, tokenHash: string) {
    check(await this.db.rpc("rotate_group_token", { p_group: groupId, p_hash: tokenHash }));
  }
  async takeEmailQuota(limit: number, warnAt: number) {
    return check(await this.db.rpc("take_email_quota", { p_limit: limit, p_warn_at: warnAt })) as { allowed: boolean; sent: number; warn: boolean };
  }
  async emailUsageToday() {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb" }).format(new Date());
    const data = check(await this.db.from("email_usage").select("sent").eq("day", day).maybeSingle());
    return Number(data?.sent ?? 0);
  }
  async pendingOutboxCount() {
    const { count, error } = await this.db.from("outbox").select("id", { count: "exact", head: true }).is("sent_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async rateLimitHit(key: string, limit: number, windowSeconds: number) {
    return !!check(await this.db.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }));
  }
  async health() {
    const v = check(await this.db.rpc("health_check"));
    if (Number(v) !== 1) throw new Error("health_check returned " + String(v));
  }

  // ---------- uploads (Supabase Storage, bucket is public-read) ----------
  async saveUpload(upload: Upload) {
    const ext = upload.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.db.storage.from(this.bucket).upload(key, upload.data, { contentType: upload.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return this.db.storage.from(this.bucket).getPublicUrl(key).data.publicUrl;
  }
  async getUpload() {
    return null; // served directly by Supabase Storage
  }
}

/** Quote a value for PostgREST filter strings (or=…). */
function quote(v: string) {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
