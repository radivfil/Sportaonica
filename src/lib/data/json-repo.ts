import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
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
import { createSeed, type DbShape } from "./seed";
import { withLock } from "./lock";
import { nextInWaitlist, sortSlots, withStats } from "./stats";
import { slugify } from "../slug";

const nowIso = () => new Date().toISOString();
export const newToken = () => randomBytes(24).toString("base64url");

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * File-backed JSON store for the demo. All mutations run inside `withLock`, so
 * "check capacity → insert" is a single critical section (no overbooking).
 */
export class JsonRepository implements Repository {
  private readonly file: string;
  private readonly lockFile: string;
  private readonly uploadsDir: string;

  constructor(private readonly dir: string) {
    this.file = path.join(dir, "db.json");
    this.lockFile = path.join(dir, "db.lock");
    this.uploadsDir = path.join(dir, "uploads");
  }

  // ---------- low-level ----------
  private async read(): Promise<DbShape> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as DbShape;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      await fs.mkdir(this.dir, { recursive: true });
      return this.mutate(async (db) => db); // seeds inside the lock
    }
  }

  private async write(db: DbShape) {
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, this.file); // atomic replace
  }

  /** Run `fn` with exclusive access; persist the (possibly mutated) db. */
  private async mutate<T>(fn: (db: DbShape) => Promise<T> | T): Promise<T> {
    await fs.mkdir(this.dir, { recursive: true });
    return withLock(this.lockFile, async () => {
      let db: DbShape;
      try {
        db = JSON.parse(await fs.readFile(this.file, "utf8")) as DbShape;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        db = createSeed();
      }
      const result = await fn(db);
      await this.write(db);
      return result;
    });
  }

  /** Replace whole DB (tests / reset script). */
  async reset(db: DbShape = createSeed()) {
    await this.mutate((current) => {
      Object.assign(current, structuredClone(db));
    });
  }

  // ---------- settings / content ----------
  async getSettings() {
    return (await this.read()).settings;
  }
  async updateSettings(patch: Partial<SiteSettings>) {
    return this.mutate((db) => (db.settings = { ...db.settings, ...patch }));
  }
  async getContent() {
    return (await this.read()).content;
  }
  async updateContent(patch: Partial<SiteContent>) {
    return this.mutate((db) => (db.content = { ...db.content, ...patch }));
  }

  // ---------- locations ----------
  async listLocations() {
    return [...(await this.read()).locations].sort((a, b) => a.order - b.order);
  }
  async getLocation(idOrSlug: string) {
    return (await this.read()).locations.find((l) => l.id === idOrSlug || l.slug === idOrSlug) ?? null;
  }
  async saveLocation(location: Location) {
    return this.mutate((db) => {
      const i = db.locations.findIndex((l) => l.id === location.id);
      if (i >= 0) db.locations[i] = location;
      else db.locations.push(location);
      return location;
    });
  }

  // ---------- activities ----------
  async listActivities(opts: { includeArchived?: boolean } = {}) {
    const db = await this.read();
    return db.activities
      .filter((a) => opts.includeArchived || a.status === "active")
      .sort((a, b) => a.order - b.order);
  }
  async getActivity(idOrSlug: string) {
    return (await this.read()).activities.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ?? null;
  }
  async saveActivity(input: Omit<Activity, "id"> & { id?: string }) {
    return this.mutate((db) => {
      const activity: Activity = { ...input, id: input.id ?? `act-${randomUUID().slice(0, 8)}`, slug: input.slug || slugify(input.name) };
      const i = db.activities.findIndex((a) => a.id === activity.id);
      if (i >= 0) db.activities[i] = activity;
      else db.activities.push(activity);
      return activity;
    });
  }
  async deleteActivity(id: string) {
    await this.mutate((db) => {
      if (db.slots.some((s) => s.activityId === id)) throw new Error("Aktivnost ima termine — arhivirajte je umjesto brisanja.");
      db.activities = db.activities.filter((a) => a.id !== id);
    });
  }

  // ---------- slots ----------
  async listSlots(opts: { includeArchived?: boolean; activityId?: string; locationId?: string } = {}): Promise<SlotWithStats[]> {
    const db = await this.read();
    return sortSlots(
      db.slots
        .filter((s) => opts.includeArchived || s.status === "active")
        .filter((s) => !opts.activityId || s.activityId === opts.activityId)
        .filter((s) => !opts.locationId || s.locationId === opts.locationId)
        .map((s) => withStats(s, db.registrations)),
    );
  }
  async getSlot(id: string) {
    const db = await this.read();
    const slot = db.slots.find((s) => s.id === id);
    return slot ? withStats(slot, db.registrations) : null;
  }
  async saveSlot(input: Omit<Slot, "id"> & { id?: string }) {
    return this.mutate((db) => {
      const slot: Slot = { ...input, id: input.id ?? `slot-${randomUUID().slice(0, 8)}` };
      const i = db.slots.findIndex((s) => s.id === slot.id);
      if (i >= 0) db.slots[i] = slot;
      else db.slots.push(slot);
      return slot;
    });
  }
  async duplicateSlot(id: string) {
    return this.mutate((db) => {
      const src = db.slots.find((s) => s.id === id);
      if (!src) throw new Error("Termin ne postoji.");
      const copy: Slot = { ...src, id: `slot-${randomUUID().slice(0, 8)}`, preEnrolled: 0 };
      db.slots.push(copy);
      return copy;
    });
  }
  async deleteSlot(id: string) {
    await this.mutate((db) => {
      if (db.registrations.some((r) => r.slotId === id && r.status !== "cancelled"))
        throw new Error("Termin ima aktivne prijave — arhivirajte ga ili premjestite prijave.");
      db.slots = db.slots.filter((s) => s.id !== id);
    });
  }

  // ---------- registrations ----------
  async listRegistrations(filter: RegistrationFilter = {}) {
    const db = await this.read();
    const slotById = new Map(db.slots.map((s) => [s.id, s]));
    const q = filter.q ? normalize(filter.q.trim()) : "";
    return db.registrations
      .filter((r) => !filter.slotId || r.slotId === filter.slotId)
      .filter((r) => !filter.status || r.status === filter.status)
      .filter((r) => !filter.activityId || slotById.get(r.slotId)?.activityId === filter.activityId)
      .filter((r) => !filter.locationId || slotById.get(r.slotId)?.locationId === filter.locationId)
      .filter(
        (r) =>
          !q ||
          normalize([r.parentName, r.childName, r.email, r.phone].join(" ")).includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getRegistration(id: string) {
    return (await this.read()).registrations.find((r) => r.id === id) ?? null;
  }
  async getRegistrationByToken(token: string) {
    if (!token) return null;
    return (await this.read()).registrations.find((r) => r.cancelToken === token) ?? null;
  }

  async book(slotId: string, input: NewRegistration, opts: { allowWaitlist: boolean; force?: boolean }): Promise<BookingResult> {
    return this.mutate((db) => {
      const slot = db.slots.find((s) => s.id === slotId);
      if (!slot) return { ok: false as const, code: "SLOT_NOT_FOUND" as const };
      if (slot.status !== "active" && !opts.force) return { ok: false as const, code: "SLOT_INACTIVE" as const };
      const stats = withStats(slot, db.registrations);
      let status: Registration["status"];
      if (!stats.isFull || opts.force) status = "confirmed";
      else if (opts.allowWaitlist) status = "waitlist";
      else return { ok: false as const, code: "SLOT_FULL" as const };
      const ts = nowIso();
      const registration: Registration = {
        ...input,
        id: randomUUID(),
        slotId,
        status,
        paid: input.paid ?? false,
        cancelToken: newToken(),
        createdAt: ts,
        updatedAt: ts,
      };
      db.registrations.push(registration);
      return { ok: true as const, registration };
    });
  }

  async updateRegistration(id: string, patch: Partial<Omit<Registration, "id" | "cancelToken" | "createdAt">>) {
    return this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (!r) throw new Error("Prijava ne postoji.");
      Object.assign(r, patch, { updatedAt: nowIso() });
      return r;
    });
  }

  async moveRegistration(id: string, targetSlotId: string, opts: { force?: boolean } = {}) {
    return this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      const target = db.slots.find((s) => s.id === targetSlotId);
      if (!r || !target) return { ok: false as const, code: "SLOT_NOT_FOUND" as const };
      if (r.slotId === targetSlotId) return { ok: true as const, registration: r, promoted: null };
      const stats = withStats(target, db.registrations);
      if (stats.isFull && !opts.force) return { ok: false as const, code: "SLOT_FULL" as const };
      const fromSlot = r.slotId;
      const wasConfirmed = r.status === "confirmed";
      r.slotId = targetSlotId;
      r.status = "confirmed";
      r.updatedAt = nowIso();
      const promoted = wasConfirmed ? this.promote(db, fromSlot) : null;
      return { ok: true as const, registration: r, promoted };
    });
  }

  /** Promote oldest waitlist entry if the slot has room. Must be called inside mutate(). */
  private promote(db: DbShape, slotId: string): Registration | null {
    const slot = db.slots.find((s) => s.id === slotId);
    if (!slot || withStats(slot, db.registrations).isFull) return null;
    const next = nextInWaitlist(db.registrations, slotId);
    if (!next) return null;
    next.status = "confirmed";
    next.updatedAt = nowIso();
    return next;
  }

  private cancelInDb(db: DbShape, r: Registration | undefined): CancelResult {
    if (!r) return { cancelled: null, promoted: null };
    if (r.status === "cancelled") return { cancelled: r, promoted: null, alreadyCancelled: true };
    const wasConfirmed = r.status === "confirmed";
    r.status = "cancelled";
    r.cancelledAt = r.updatedAt = nowIso();
    const promoted = wasConfirmed ? this.promote(db, r.slotId) : null;
    return { cancelled: r, promoted };
  }

  async cancelRegistration(id: string) {
    return this.mutate((db) => this.cancelInDb(db, db.registrations.find((r) => r.id === id)));
  }
  async cancelByToken(token: string) {
    if (!token) return { cancelled: null, promoted: null };
    return this.mutate((db) => this.cancelInDb(db, db.registrations.find((r) => r.cancelToken === token)));
  }
  async deleteRegistration(id: string) {
    await this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (!r) return;
      const wasConfirmed = r.status === "confirmed";
      db.registrations = db.registrations.filter((x) => x.id !== id);
      if (wasConfirmed) this.promote(db, r.slotId);
    });
  }

  // ---------- posts ----------
  async listPosts(opts: { status?: PostStatus; limit?: number } = {}) {
    const posts = (await this.read()).posts
      .filter((p) => !opts.status || p.status === opts.status)
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    return opts.limit ? posts.slice(0, opts.limit) : posts;
  }
  async getPost(id: string) {
    return (await this.read()).posts.find((p) => p.id === id) ?? null;
  }
  async getPostBySlug(slug: string) {
    return (await this.read()).posts.find((p) => p.slug === slug) ?? null;
  }
  async savePost(input: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    return this.mutate((db) => {
      const ts = nowIso();
      const existing = input.id ? db.posts.find((p) => p.id === input.id) : undefined;
      let slug = slugify(input.slug || input.title) || `objava-${Date.now()}`;
      while (db.posts.some((p) => p.slug === slug && p.id !== input.id)) slug = `${slug}-2`;
      const post: Post = {
        ...input,
        slug,
        id: existing?.id ?? randomUUID(),
        createdAt: existing?.createdAt ?? ts,
        updatedAt: ts,
        publishedAt: input.status === "published" ? (input.publishedAt ?? existing?.publishedAt ?? ts) : input.publishedAt,
      };
      if (existing) Object.assign(existing, post);
      else db.posts.push(post);
      return post;
    });
  }
  async deletePost(id: string) {
    await this.mutate((db) => {
      db.posts = db.posts.filter((p) => p.id !== id);
    });
  }

  // ---------- contact ----------
  async createContactMessage(msg: Omit<ContactMessage, "id" | "createdAt">) {
    return this.mutate((db) => {
      const m: ContactMessage = { ...msg, id: randomUUID(), createdAt: nowIso() };
      db.contactMessages.push(m);
      return m;
    });
  }
  async listContactMessages() {
    return [...(await this.read()).contactMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------- uploads ----------
  async saveUpload(upload: Upload) {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    const ext = path.extname(upload.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await fs.writeFile(path.join(this.uploadsDir, name), upload.data);
    await fs.writeFile(path.join(this.uploadsDir, `${name}.type`), upload.contentType);
    return `/api/uploads/${name}`;
  }
  async getUpload(name: string) {
    if (!/^[\w.-]+$/.test(name)) return null;
    try {
      const data = await fs.readFile(path.join(this.uploadsDir, name));
      const contentType = await fs.readFile(path.join(this.uploadsDir, `${name}.type`), "utf8").catch(() => "application/octet-stream");
      return { name, data, contentType };
    } catch {
      return null;
    }
  }
}
