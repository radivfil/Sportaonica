import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Repository } from "./repository";
import type {
  Activity,
  BookingResult,
  CancelResult,
  ContactMessage,
  Location,
  NewRegistration,
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
import { createSeed } from "./seed";
import { sortSlots, withStats } from "./stats";
import { slugify } from "../slug";

/* ------------------------------------------------------------------ *
 * snake_case <-> camelCase mapping
 * ------------------------------------------------------------------ */
type Row = Record<string, unknown>;
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
function fromRow<T>(row: Row | null): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row ?? {})) out[toCamel(k)] = v === null ? undefined : v;
  return out as T;
}
function toRow(obj: object): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T; // may still be null for maybeSingle() — callers check
}

/**
 * Supabase (Postgres) implementation. Capacity-critical operations call the
 * SQL functions in supabase/migrations/0001_init.sql, which lock the slot
 * row (SELECT … FOR UPDATE) so concurrent bookings cannot overbook.
 */
export class SupabaseRepository implements Repository {
  private db: SupabaseClient;
  constructor(url: string, serviceKey: string, private bucket = "uploads") {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  private async kv<T>(key: string, fallback: T): Promise<T> {
    const data = check(await this.db.from("site_kv").select("value").eq("key", key).maybeSingle()) as { value: unknown } | null;
    return (data?.value as T) ?? fallback;
  }
  private async setKv<T>(key: string, value: T) {
    check(await this.db.from("site_kv").upsert({ key, value, updated_at: new Date().toISOString() }));
    return value;
  }

  async getSettings() {
    return this.kv<SiteSettings>("settings", createSeed().settings);
  }
  async updateSettings(patch: Partial<SiteSettings>) {
    return this.setKv("settings", { ...(await this.getSettings()), ...patch });
  }
  async getContent() {
    return this.kv<SiteContent>("content", createSeed().content);
  }
  async updateContent(patch: Partial<SiteContent>) {
    return this.setKv("content", { ...(await this.getContent()), ...patch });
  }

  async listLocations() {
    return check(await this.db.from("locations").select("*").order("order")).map((r) => fromRow<Location>(r));
  }
  async getLocation(idOrSlug: string) {
    const r = check(await this.db.from("locations").select("*").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).maybeSingle());
    return r ? fromRow<Location>(r) : null;
  }
  async saveLocation(location: Location) {
    return fromRow<Location>(check(await this.db.from("locations").upsert(toRow(location)).select().single()));
  }

  async listActivities(opts: { includeArchived?: boolean } = {}) {
    let q = this.db.from("activities").select("*").order("order");
    if (!opts.includeArchived) q = q.eq("status", "active");
    return check(await q).map((r) => fromRow<Activity>(r));
  }
  async getActivity(idOrSlug: string) {
    const r = check(await this.db.from("activities").select("*").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).maybeSingle());
    return r ? fromRow<Activity>(r) : null;
  }
  async saveActivity(input: Omit<Activity, "id"> & { id?: string }) {
    const row = { ...input, id: input.id ?? `act-${randomBytes(4).toString("hex")}`, slug: input.slug || slugify(input.name) };
    return fromRow<Activity>(check(await this.db.from("activities").upsert(toRow(row)).select().single()));
  }
  async deleteActivity(id: string) {
    check(await this.db.from("activities").delete().eq("id", id));
  }

  private async allActiveRegs(slotIds?: string[]) {
    let q = this.db.from("registrations").select("id, slot_id, status, created_at").neq("status", "cancelled");
    if (slotIds) q = q.in("slot_id", slotIds);
    return check(await q).map((r) => fromRow<Registration>(r));
  }
  async listSlots(opts: { includeArchived?: boolean; activityId?: string; locationId?: string } = {}): Promise<SlotWithStats[]> {
    let q = this.db.from("slots").select("*");
    if (!opts.includeArchived) q = q.eq("status", "active");
    if (opts.activityId) q = q.eq("activity_id", opts.activityId);
    if (opts.locationId) q = q.eq("location_id", opts.locationId);
    const slots = check(await q).map((r) => fromRow<Slot>(r));
    const regs = await this.allActiveRegs(slots.map((s) => s.id));
    return sortSlots(slots.map((s) => withStats(s, regs)));
  }
  async getSlot(id: string) {
    const r = check(await this.db.from("slots").select("*").eq("id", id).maybeSingle());
    if (!r) return null;
    return withStats(fromRow<Slot>(r), await this.allActiveRegs([id]));
  }
  async saveSlot(input: Omit<Slot, "id"> & { id?: string }) {
    const row = { ...input, id: input.id ?? `slot-${randomBytes(4).toString("hex")}` };
    return fromRow<Slot>(check(await this.db.from("slots").upsert(toRow(row)).select().single()));
  }
  async duplicateSlot(id: string) {
    const src = await this.getSlot(id);
    if (!src) throw new Error("Termin ne postoji.");
    const { activityId, locationId, dayOfWeek, startTime, endTime, capacity, status, note } = src;
    return this.saveSlot({ activityId, locationId, dayOfWeek, startTime, endTime, capacity, status, note, preEnrolled: 0 });
  }
  async deleteSlot(id: string) {
    check(await this.db.from("slots").delete().eq("id", id));
  }

  async listRegistrations(filter: RegistrationFilter = {}) {
    let q = this.db.from("registrations").select("*, slots!inner(activity_id, location_id)").order("created_at", { ascending: false });
    if (filter.slotId) q = q.eq("slot_id", filter.slotId);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.activityId) q = q.eq("slots.activity_id", filter.activityId);
    if (filter.locationId) q = q.eq("slots.location_id", filter.locationId);
    if (filter.q) {
      const term = filter.q.replace(/[%,()]/g, " ").trim();
      q = q.or(`parent_name.ilike.%${term}%,child_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    return check(await q).map((r) => {
      const { slots: _ignored, ...rest } = r as Row;
      void _ignored;
      return fromRow<Registration>(rest);
    });
  }
  async getRegistration(id: string) {
    const r = check(await this.db.from("registrations").select("*").eq("id", id).maybeSingle());
    return r ? fromRow<Registration>(r) : null;
  }
  async getRegistrationByToken(token: string) {
    const r = check(await this.db.from("registrations").select("*").eq("cancel_token", token).maybeSingle());
    return r ? fromRow<Registration>(r) : null;
  }
  async book(slotId: string, input: NewRegistration, opts: { allowWaitlist: boolean; force?: boolean }): Promise<BookingResult> {
    const res = check(
      await this.db.rpc("book_registration", {
        p_slot_id: slotId,
        p_payload: input,
        p_allow_waitlist: opts.allowWaitlist,
        p_force: !!opts.force,
      }),
    ) as { ok: boolean; code?: string; registration?: Row };
    if (!res.ok) return { ok: false, code: res.code as "SLOT_FULL" };
    return { ok: true, registration: fromRow<Registration>(res.registration!) };
  }
  async updateRegistration(id: string, patch: Partial<Omit<Registration, "id" | "cancelToken" | "createdAt">>) {
    const row = toRow({ ...patch, updatedAt: new Date().toISOString() });
    return fromRow<Registration>(check(await this.db.from("registrations").update(row).eq("id", id).select().single()));
  }
  async moveRegistration(id: string, targetSlotId: string, opts: { force?: boolean } = {}) {
    const res = check(await this.db.rpc("move_registration", { p_id: id, p_target_slot: targetSlotId, p_force: !!opts.force })) as {
      ok: boolean;
      code?: string;
      registration?: Row;
      promoted?: Row | null;
    };
    if (!res.ok) return { ok: false as const, code: res.code as "SLOT_FULL" };
    return {
      ok: true as const,
      registration: fromRow<Registration>(res.registration!),
      promoted: res.promoted ? fromRow<Registration>(res.promoted) : null,
    };
  }
  private mapCancel(res: { cancelled: Row | null; promoted: Row | null; alreadyCancelled?: boolean }): CancelResult {
    return {
      cancelled: res.cancelled ? fromRow<Registration>(res.cancelled) : null,
      promoted: res.promoted ? fromRow<Registration>(res.promoted) : null,
      alreadyCancelled: res.alreadyCancelled,
    };
  }
  async cancelRegistration(id: string) {
    return this.mapCancel(check(await this.db.rpc("cancel_registration", { p_id: id })));
  }
  async cancelByToken(token: string) {
    return this.mapCancel(check(await this.db.rpc("cancel_registration", { p_token: token })));
  }
  async deleteRegistration(id: string) {
    check(await this.db.rpc("delete_registration", { p_id: id }));
  }

  async listPosts(opts: { status?: PostStatus; limit?: number } = {}) {
    let q = this.db.from("posts").select("*").order("published_at", { ascending: false, nullsFirst: false });
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.limit) q = q.limit(opts.limit);
    return check(await q).map((r) => fromRow<Post>(r));
  }
  async getPost(id: string) {
    const r = check(await this.db.from("posts").select("*").eq("id", id).maybeSingle());
    return r ? fromRow<Post>(r) : null;
  }
  async getPostBySlug(slug: string) {
    const r = check(await this.db.from("posts").select("*").eq("slug", slug).maybeSingle());
    return r ? fromRow<Post>(r) : null;
  }
  async savePost(input: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const ts = new Date().toISOString();
    const row = {
      ...input,
      slug: slugify(input.slug || input.title),
      updatedAt: ts,
      publishedAt: input.status === "published" ? (input.publishedAt ?? ts) : input.publishedAt,
    };
    return fromRow<Post>(check(await this.db.from("posts").upsert(toRow(row)).select().single()));
  }
  async deletePost(id: string) {
    check(await this.db.from("posts").delete().eq("id", id));
  }

  async createContactMessage(msg: Omit<ContactMessage, "id" | "createdAt">) {
    return fromRow<ContactMessage>(check(await this.db.from("contact_messages").insert(toRow(msg)).select().single()));
  }
  async listContactMessages() {
    return check(await this.db.from("contact_messages").select("*").order("created_at", { ascending: false })).map((r) =>
      fromRow<ContactMessage>(r),
    );
  }

  async saveUpload(upload: Upload) {
    const ext = upload.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `posts/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    check(await this.db.storage.from(this.bucket).upload(key, upload.data, { contentType: upload.contentType }));
    return this.db.storage.from(this.bucket).getPublicUrl(key).data.publicUrl;
  }
  async getUpload(): Promise<Upload | null> {
    return null; // served directly from Supabase Storage public URLs
  }

  /** One-time import of demo data into empty tables. */
  async seedIfEmpty() {
    const existing = check(await this.db.from("activities").select("id").limit(1));
    if (existing.length) return false;
    const seed = createSeed();
    await this.setKv("settings", seed.settings);
    await this.setKv("content", seed.content);
    check(await this.db.from("locations").insert(seed.locations.map(toRow)));
    check(await this.db.from("activities").insert(seed.activities.map(toRow)));
    check(await this.db.from("slots").insert(seed.slots.map(toRow)));
    check(
      await this.db.from("posts").insert(
        seed.posts.map(({ id: _id, ...p }) => {
          void _id;
          return toRow(p);
        }),
      ),
    );
    return true;
  }
}
