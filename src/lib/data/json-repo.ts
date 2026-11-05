import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AdminResult, Repository, TokenRegistration } from "./repository";
import type {
  Activity,
  AuditEntry,
  BookedItem,
  BookingRequest,
  BookingResult,
  CancelResult,
  GalleryImage,
  Inquiry,
  Location,
  NewInquiry,
  OutboxItem,
  OutboxKind,
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
import { canCancelByLink, isAgeAllowed, isDuplicate, isSlotPast, sortSlots, waitlistQueue, withStats, zagrebDate } from "./rules";
import { slugify } from "../slug";

const nowIso = () => new Date().toISOString();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * File-backed JSON store for local development and tests. Mirrors the SQL
 * functions in supabase/migrations: every mutation runs inside `withLock`,
 * so "validate → count seats → insert" is one critical section.
 *
 * `actor` is what the audit log records (the database derives it from the JWT).
 */
export class JsonRepository implements Repository {
  private readonly file: string;
  private readonly lockFile: string;
  private readonly uploadsDir: string;

  constructor(
    private readonly dir: string,
    private readonly actor = "sustav",
    private readonly isAdmin = true,
  ) {
    this.file = path.join(dir, "db.json");
    this.lockFile = path.join(dir, "db.lock");
    this.uploadsDir = path.join(dir, "uploads");
  }

  /** Same store, different caller identity. */
  as(actor: string, isAdmin: boolean) {
    return new JsonRepository(this.dir, actor, isAdmin);
  }

  // ---------- low-level ----------
  private async read(): Promise<DbShape> {
    try {
      const db = JSON.parse(await fs.readFile(this.file, "utf8")) as DbShape;
      if (db.version === 2) return db;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT" && !(err instanceof SyntaxError)) throw err;
    }
    return this.mutate((db) => db); // (re)seeds inside the lock
  }

  private async write(db: DbShape) {
    const tmp = `${this.file}.${process.pid}.${Date.now()}.${randomBytes(3).toString("hex")}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, this.file); // atomic replace
  }

  private async mutate<T>(fn: (db: DbShape) => Promise<T> | T): Promise<T> {
    await fs.mkdir(this.dir, { recursive: true });
    return withLock(this.lockFile, async () => {
      let db: DbShape;
      try {
        db = JSON.parse(await fs.readFile(this.file, "utf8")) as DbShape;
        if (db.version !== 2) db = createSeed();
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT" && !(err instanceof SyntaxError)) throw err;
        db = createSeed();
      }
      const result = await fn(db);
      await this.write(db);
      return result;
    });
  }

  private requireAdmin() {
    if (!this.isAdmin) throw new Error("forbidden");
  }

  /** Replace whole DB (tests / reset script). */
  async reset(db: DbShape = createSeed()) {
    await this.mutate((current) => {
      Object.assign(current, structuredClone(db));
    });
  }

  private log(db: DbShape, action: AuditEntry["action"], entityId?: string, details?: string) {
    db.audit.push({ id: randomUUID(), at: nowIso(), actor: this.actor, action, entityId, details: details?.slice(0, 500) });
  }
  private enqueue(db: DbShape, kind: OutboxKind, refId: string) {
    db.outbox.push({ id: randomUUID(), kind, refId, attempts: 0, createdAt: nowIso() });
  }

  // ---------- settings / content ----------
  async getSettings() {
    return (await this.read()).settings;
  }
  async updateSettings(patch: Partial<SiteSettings>) {
    this.requireAdmin();
    return this.mutate((db) => (db.settings = { ...db.settings, ...patch }));
  }
  async getContent() {
    return (await this.read()).content;
  }
  async updateContent(patch: Partial<SiteContent>) {
    this.requireAdmin();
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
    this.requireAdmin();
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
    return db.activities.filter((a) => (opts.includeArchived && this.isAdmin) || a.status === "active").sort((a, b) => a.order - b.order);
  }
  async getActivity(idOrSlug: string) {
    const a = (await this.read()).activities.find((x) => x.id === idOrSlug || x.slug === idOrSlug) ?? null;
    return a && (a.status === "active" || this.isAdmin) ? a : null;
  }
  async saveActivity(input: Omit<Activity, "id"> & { id?: string }) {
    this.requireAdmin();
    return this.mutate((db) => {
      let slug = input.slug || slugify(input.name);
      while (db.activities.some((a) => a.slug === slug && a.id !== input.id)) slug = `${slug}-2`;
      const activity: Activity = { ...input, slug, id: input.id ?? `act-${randomUUID().slice(0, 8)}` };
      const i = db.activities.findIndex((a) => a.id === activity.id);
      if (i >= 0) db.activities[i] = activity;
      else db.activities.push(activity);
      return activity;
    });
  }
  async deleteActivity(id: string) {
    this.requireAdmin();
    await this.mutate((db) => {
      if (db.slots.some((s) => s.activityId === id)) throw new Error("Aktivnost ima termine. Arhivirajte je umjesto brisanja.");
      db.activities = db.activities.filter((a) => a.id !== id);
    });
  }

  // ---------- slots ----------
  private visibleSlot(db: DbShape, s: Slot, includeArchived: boolean) {
    if (includeArchived && this.isAdmin) return true;
    const a = db.activities.find((x) => x.id === s.activityId);
    return s.status === "active" && a?.status === "active";
  }
  async listSlots(opts: { includeArchived?: boolean } = {}): Promise<SlotWithStats[]> {
    const db = await this.read();
    const today = zagrebDate();
    return sortSlots(db.slots.filter((s) => this.visibleSlot(db, s, !!opts.includeArchived)).map((s) => withStats(s, db.registrations, today)));
  }
  async getSlot(id: string, opts: { includeArchived?: boolean } = {}) {
    const db = await this.read();
    const slot = db.slots.find((s) => s.id === id);
    return slot && this.visibleSlot(db, slot, !!opts.includeArchived) ? withStats(slot, db.registrations) : null;
  }
  async saveSlots(inputs: (Omit<Slot, "id"> & { id?: string })[]) {
    this.requireAdmin();
    return this.mutate((db) => {
      const saved: Slot[] = [];
      for (const input of inputs) {
        const slot: Slot = { ...input, id: input.id ?? `slot-${randomUUID().slice(0, 8)}` };
        const i = db.slots.findIndex((s) => s.id === slot.id);
        if (i >= 0) {
          const old = db.slots[i];
          const active = withStats(old, db.registrations).activeCount;
          if (slot.capacity < active) throw new Error(`Kapacitet (${slot.capacity}) ne može biti manji od broja upisanih (${active}).`);
          db.slots[i] = slot;
          if (slot.capacity > old.capacity || (slot.status === "active" && old.status !== "active")) this.promote(db, slot.id);
        } else db.slots.push(slot);
        saved.push(slot);
      }
      return saved;
    });
  }
  async deleteSlot(id: string) {
    this.requireAdmin();
    await this.mutate((db) => {
      if (db.registrations.some((r) => r.slotId === id)) throw new Error("Termin ima prijave. Arhivirajte ga umjesto brisanja.");
      db.slots = db.slots.filter((s) => s.id !== id);
    });
  }

  // ---------- registrations: admin ----------
  async listRegistrations(filter: RegistrationFilter = {}) {
    this.requireAdmin();
    const db = await this.read();
    const slotById = new Map(db.slots.map((s) => [s.id, s]));
    const q = filter.q ? normalize(filter.q.trim()) : "";
    return db.registrations
      .filter((r) => !filter.slotId || r.slotId === filter.slotId)
      .filter((r) => !filter.groupId || r.groupId === filter.groupId)
      .filter((r) => !filter.status || r.status === filter.status)
      .filter((r) => !filter.activityId || slotById.get(r.slotId)?.activityId === filter.activityId)
      .filter((r) => !filter.locationId || slotById.get(r.slotId)?.locationId === filter.locationId)
      .filter((r) => !q || normalize([r.parentName, r.childName, r.email, r.phone].join(" ")).includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getRegistration(id: string) {
    this.requireAdmin();
    return (await this.read()).registrations.find((r) => r.id === id) ?? null;
  }
  async updateRegistration(id: string, patch: Parameters<Repository["updateRegistration"]>[1]) {
    this.requireAdmin();
    await this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (!r) throw new Error("Prijava ne postoji.");
      const labels: Record<string, string> = { parentName: "roditelj", email: "email", phone: "telefon", childName: "dijete", childBirthDate: "datum_rodenja", healthNote: "zdravlje", adminNote: "biljeska" };
      const changed: string[] = [];
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || (r as unknown as Record<string, unknown>)[k] === v) continue;
        changed.push(k === "paid" ? `placeno=${v}` : labels[k] ?? k);
      }
      Object.assign(r, patch, { updatedAt: nowIso() });
      if (changed.length) this.log(db, "registration.update", id, changed.join(", "));
    });
  }

  /** Promote waitlisted registrations (FIFO) while seats are free. Call inside mutate(). */
  private promote(db: DbShape, slotId: string): number {
    const slot = db.slots.find((s) => s.id === slotId);
    if (!slot) return 0;
    let count = 0;
    for (;;) {
      if (withStats(slot, db.registrations).isFull) break;
      const next = waitlistQueue(db.registrations, slotId)[0];
      if (!next) break;
      next.status = "active";
      next.promotedAt = next.updatedAt = nowIso();
      this.log(db, "registration.promote", next.id, "waitlist→active");
      this.enqueue(db, "promoted", next.id);
      count++;
    }
    return count;
  }

  private cancelOne(db: DbShape, r: Registration, status: "cancelled_parent" | "cancelled_admin"): number {
    const wasActive = r.status === "active";
    r.status = status;
    r.cancelledAt = r.updatedAt = nowIso();
    this.log(db, "registration.cancel", r.id, status);
    return wasActive ? this.promote(db, r.slotId) : 0;
  }

  async cancelRegistrationAdmin(id: string): Promise<AdminResult> {
    this.requireAdmin();
    return this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (!r) return { ok: false as const, code: "NOT_FOUND" };
      if (r.status !== "active" && r.status !== "waitlist") return { ok: true as const, promoted: 0 };
      return { ok: true as const, promoted: this.cancelOne(db, r, "cancelled_admin") };
    });
  }

  async moveRegistration(id: string, targetSlotId: string, opts: { force?: boolean } = {}): Promise<AdminResult> {
    this.requireAdmin();
    return this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      const target = db.slots.find((s) => s.id === targetSlotId);
      if (!r || !target) return { ok: false as const, code: "SLOT_NOT_FOUND" };
      if (r.slotId === targetSlotId) return { ok: true as const, promoted: 0 };
      if (r.status !== "active" && r.status !== "waitlist") return { ok: false as const, code: "SLOT_INACTIVE" };
      if (isDuplicate(db.registrations, targetSlotId, r.childName, r.childBirthDate)) return { ok: false as const, code: "DUPLICATE" };
      if (withStats(target, db.registrations).isFull && !opts.force) return { ok: false as const, code: "SLOT_FULL" };
      const from = r.slotId;
      const wasActive = r.status === "active";
      this.log(db, "registration.move", r.id, `${from}→${targetSlotId}`);
      r.slotId = targetSlotId;
      r.status = "active";
      r.updatedAt = nowIso();
      return { ok: true as const, promoted: wasActive ? this.promote(db, from) : 0 };
    });
  }

  async promoteRegistration(id: string, opts: { force?: boolean } = {}): Promise<AdminResult> {
    this.requireAdmin();
    return this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (!r) return { ok: false as const, code: "SLOT_NOT_FOUND" };
      if (r.status !== "waitlist") return { ok: true as const };
      const slot = db.slots.find((s) => s.id === r.slotId)!;
      if (withStats(slot, db.registrations).isFull && !opts.force) return { ok: false as const, code: "SLOT_FULL" };
      r.status = "active";
      r.promotedAt = r.updatedAt = nowIso();
      this.log(db, "registration.promote", r.id, "waitlist→active");
      this.enqueue(db, "promoted", r.id);
      return { ok: true as const };
    });
  }

  private anonymizeInDb(db: DbShape, r: Registration) {
    if (r.status === "active" || r.status === "waitlist") this.cancelOne(db, r, "cancelled_admin");
    Object.assign(r, {
      parentName: "Obrisano",
      phone: "-",
      email: "obrisano@invalid",
      childName: "Obrisano",
      childBirthDate: "",
      healthNote: undefined,
      adminNote: undefined,
      cancelTokenHash: "0".repeat(64),
      anonymizedAt: nowIso(),
      updatedAt: nowIso(),
    });
    db.outbox = db.outbox.filter((o) => o.sentAt || (o.refId !== r.id && o.refId !== r.groupId));
    this.log(db, "registration.anonymize", r.id);
  }

  async anonymizeRegistration(id: string) {
    this.requireAdmin();
    await this.mutate((db) => {
      const r = db.registrations.find((x) => x.id === id);
      if (r && !r.anonymizedAt) this.anonymizeInDb(db, r);
    });
  }

  async purgeExpired() {
    this.requireAdmin();
    return this.mutate((db) => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - db.settings.retentionMonths);
      const cutoffYmd = zagrebDate(cutoff);
      let count = 0;
      for (const r of db.registrations) {
        if (r.anonymizedAt) continue;
        const slot = db.slots.find((s) => s.id === r.slotId);
        const ended =
          (r.cancelledAt && r.cancelledAt.slice(0, 10) < cutoffYmd) ||
          (slot?.kind === "single" && !!slot.date && slot.date < cutoffYmd) ||
          (slot?.kind === "weekly" && !!slot.validTo && slot.validTo < cutoffYmd);
        if (ended) {
          this.anonymizeInDb(db, r);
          count++;
        }
      }
      for (const i of db.inquiries) {
        if (i.createdAt.slice(0, 10) < cutoffYmd && i.email !== "obrisano@invalid") Object.assign(i, { name: "Obrisano", email: "obrisano@invalid", phone: undefined, message: "" });
      }
      return count;
    });
  }

  // ---------- registrations: public ----------
  async book(req: BookingRequest): Promise<BookingResult> {
    if (req.admin && Object.values(req.admin).some(Boolean) && !this.isAdmin) throw new Error("forbidden");
    const force = !!req.admin?.force;
    const ignoreAge = !!req.admin?.ignoreAge;
    const ids = [...new Set(req.slotIds)].sort();
    const p = req.input;
    if (!ids.length || ids.length > 60) return { ok: false, code: "SLOT_NOT_FOUND" };
    const today = zagrebDate();
    if (
      p.parentName.trim().length < 3 ||
      p.childName.trim().length < 2 ||
      !EMAIL_RE.test(p.email) ||
      p.phone.replace(/\D/g, "").length < 6 ||
      !p.gdprConsent ||
      !/^[0-9a-f]{64}$/.test(req.cancelTokenHash) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.childBirthDate) ||
      p.childBirthDate > today
    ) {
      return { ok: false, code: "INVALID" };
    }

    return this.mutate((db) => {
      const slots = ids.map((id) => db.slots.find((s) => s.id === id));
      if (slots.some((s) => !s)) return { ok: false as const, code: "SLOT_NOT_FOUND" as const };
      for (const slot of slots as Slot[]) {
        const activity = db.activities.find((a) => a.id === slot.activityId)!;
        if ((slot.status !== "active" || activity.status !== "active" || isSlotPast(slot, today)) && !force)
          return { ok: false as const, code: "SLOT_INACTIVE" as const, slotId: slot.id };
        if (!ignoreAge && !isAgeAllowed(activity, p.childBirthDate, today)) return { ok: false as const, code: "AGE_OUT_OF_RANGE" as const, slotId: slot.id };
        if (isDuplicate(db.registrations, slot.id, p.childName, p.childBirthDate)) return { ok: false as const, code: "DUPLICATE" as const, slotId: slot.id };
        if (withStats(slot, db.registrations).isFull && !force && !req.allowWaitlist) return { ok: false as const, code: "SLOT_FULL" as const, slotId: slot.id };
      }
      const groupId = randomUUID();
      const ts = nowIso();
      const out: BookedItem[] = [];
      for (const slot of sortSlots(slots as Slot[])) {
        const status = !withStats(slot, db.registrations).isFull || force ? "active" : "waitlist";
        const reg: Registration = {
          id: randomUUID(),
          slotId: slot.id,
          groupId,
          status,
          parentName: p.parentName.trim(),
          phone: p.phone.trim(),
          email: p.email.trim().toLowerCase(),
          childName: p.childName.trim(),
          childBirthDate: p.childBirthDate,
          healthNote: p.healthNote?.trim() || undefined,
          gdprConsent: true,
          paid: !!req.admin?.paid,
          adminNote: req.admin?.adminNote?.trim() || undefined,
          cancelTokenHash: req.cancelTokenHash,
          createdAt: ts,
          updatedAt: ts,
        };
        db.registrations.push(reg);
        this.log(db, "registration.create", reg.id, `status=${status} slot=${slot.id}`);
        out.push({ id: reg.id, slotId: slot.id, status, waitlistPosition: status === "waitlist" ? waitlistQueue(db.registrations, slot.id).length : null });
      }
      this.enqueue(db, "confirmation", groupId);
      this.enqueue(db, "owner_new_registration", groupId);
      return { ok: true as const, groupId, registrations: out };
    });
  }

  async registrationsByToken(token: string): Promise<TokenRegistration[]> {
    if (!token || token.length < 20 || token.length > 200) return [];
    const hash = sha256(token);
    const db = await this.read();
    const deadline = db.settings.cancelDeadlineHours;
    return sortSlots(
      db.registrations
        .filter((r) => r.cancelTokenHash === hash && !r.anonymizedAt)
        .map((r) => ({ r, slot: db.slots.find((s) => s.id === r.slotId)! }))
        .map(({ r, slot }) => ({ ...slot, reg: r })),
    ).map(({ reg: r, ...slot }) => ({
      id: r.id,
      slotId: r.slotId,
      status: r.status,
      childName: r.childName,
      groupId: r.groupId,
      cancelledAt: r.cancelledAt,
      cancellable: (r.status === "active" || r.status === "waitlist") && canCancelByLink(slot as Slot, deadline),
    }));
  }

  async cancelByToken(token: string, ids?: string[]): Promise<CancelResult> {
    if (!token || token.length < 20 || token.length > 200) return { cancelled: [], tooLate: [], promoted: 0 };
    const hash = sha256(token);
    const caller = this.as("javno (roditelj)", false);
    return this.mutate((db) => {
      const out: CancelResult = { cancelled: [], tooLate: [], promoted: 0 };
      let groupId: string | undefined;
      for (const r of db.registrations) {
        if (r.cancelTokenHash !== hash || r.anonymizedAt || (r.status !== "active" && r.status !== "waitlist")) continue;
        if (ids && !ids.includes(r.id)) continue;
        const slot = db.slots.find((s) => s.id === r.slotId)!;
        if (!canCancelByLink(slot, db.settings.cancelDeadlineHours)) {
          out.tooLate.push(r.id);
          continue;
        }
        out.promoted += caller.cancelOne(db, r, "cancelled_parent");
        out.cancelled.push(r.id);
        groupId = r.groupId;
      }
      if (groupId) this.enqueue(db, "cancellation", groupId);
      return out;
    });
  }

  // ---------- posts ----------
  async listPosts(opts: { status?: PostStatus; limit?: number } = {}) {
    const status = this.isAdmin ? opts.status : "published";
    const posts = (await this.read()).posts
      .filter((p) => !status || p.status === status)
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    return opts.limit ? posts.slice(0, opts.limit) : posts;
  }
  async getPost(id: string) {
    const p = (await this.read()).posts.find((x) => x.id === id) ?? null;
    return p && (p.status === "published" || this.isAdmin) ? p : null;
  }
  async getPostBySlug(slug: string) {
    const p = (await this.read()).posts.find((x) => x.slug === slug) ?? null;
    return p && (p.status === "published" || this.isAdmin) ? p : null;
  }
  async savePost(input: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    this.requireAdmin();
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
    this.requireAdmin();
    await this.mutate((db) => {
      db.posts = db.posts.filter((p) => p.id !== id);
    });
  }

  // ---------- gallery ----------
  async listGallery() {
    return [...(await this.read()).gallery].sort((a, b) => a.order - b.order);
  }
  async saveGalleryImage(input: Omit<GalleryImage, "id" | "createdAt"> & { id?: string }) {
    this.requireAdmin();
    return this.mutate((db) => {
      const existing = input.id ? db.gallery.find((g) => g.id === input.id) : undefined;
      const img: GalleryImage = { ...input, id: existing?.id ?? randomUUID(), createdAt: existing?.createdAt ?? nowIso() };
      if (existing) Object.assign(existing, img);
      else db.gallery.push(img);
      return img;
    });
  }
  async deleteGalleryImage(id: string) {
    this.requireAdmin();
    await this.mutate((db) => {
      db.gallery = db.gallery.filter((g) => g.id !== id);
    });
  }
  async reorderGallery(ids: string[]) {
    this.requireAdmin();
    await this.mutate((db) => {
      ids.forEach((id, i) => {
        const g = db.gallery.find((x) => x.id === id);
        if (g) g.order = i + 1;
      });
    });
  }

  // ---------- inquiries ----------
  async createInquiry(input: NewInquiry) {
    if (input.name.trim().length < 2 || !EMAIL_RE.test(input.email) || input.message.length > 3000) return { ok: false };
    return this.mutate((db) => {
      const inq: Inquiry = { ...input, id: randomUUID(), handled: false, createdAt: nowIso() };
      db.inquiries.push(inq);
      this.enqueue(db, "owner_new_inquiry", inq.id);
      return { ok: true };
    });
  }
  async listInquiries() {
    this.requireAdmin();
    return [...(await this.read()).inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getInquiry(id: string) {
    this.requireAdmin();
    return (await this.read()).inquiries.find((i) => i.id === id) ?? null;
  }
  async setInquiryHandled(id: string, handled: boolean) {
    this.requireAdmin();
    await this.mutate((db) => {
      const i = db.inquiries.find((x) => x.id === id);
      if (i) i.handled = handled;
    });
  }

  // ---------- audit ----------
  async audit(action: AuditEntry["action"], entityId?: string, details?: string) {
    this.requireAdmin();
    await this.mutate((db) => this.log(db, action, entityId, details));
  }
  async listAudit(limit = 200) {
    this.requireAdmin();
    return [...(await this.read()).audit].reverse().slice(0, limit);
  }

  // ---------- system ----------
  async claimOutbox(limit = 20) {
    this.requireAdmin();
    return this.mutate((db) => {
      const now = Date.now();
      const due = db.outbox.filter((o) => !o.sentAt && o.attempts < 8 && Date.parse(o.nextAttemptAt ?? o.createdAt) <= now).slice(0, limit);
      for (const o of due) {
        o.attempts++;
        o.nextAttemptAt = new Date(now + Math.min(o.attempts * o.attempts * 60_000, 6 * 3600_000)).toISOString();
      }
      return structuredClone(due) as OutboxItem[];
    });
  }
  async finishOutbox(id: string, error?: string, retryAt?: Date) {
    this.requireAdmin();
    await this.mutate((db) => {
      const o = db.outbox.find((x) => x.id === id);
      if (!o) return;
      if (retryAt) {
        o.attempts = Math.max(0, o.attempts - 1);
        o.nextAttemptAt = retryAt.toISOString();
      }
      if (error) o.lastError = error.slice(0, 500);
      else o.sentAt = nowIso();
    });
  }
  async rotateGroupToken(groupId: string, tokenHash: string) {
    this.requireAdmin();
    await this.mutate((db) => {
      for (const r of db.registrations) if (r.groupId === groupId && !r.anonymizedAt) r.cancelTokenHash = tokenHash;
    });
  }
  async takeEmailQuota(limit: number, warnAt: number) {
    return this.mutate((db) => {
      const day = zagrebDate();
      const u = (db.emailUsage[day] ??= { sent: 0, warned: false });
      if (u.sent >= limit) return { allowed: false, sent: u.sent, warn: false };
      u.sent++;
      const warn = u.sent >= warnAt && !u.warned;
      if (warn) u.warned = true;
      return { allowed: true, sent: u.sent, warn };
    });
  }
  async emailUsageToday() {
    return (await this.read()).emailUsage[zagrebDate()]?.sent ?? 0;
  }
  async pendingOutboxCount() {
    return (await this.read()).outbox.filter((o) => !o.sentAt).length;
  }
  async rateLimitHit(key: string, limit: number, windowSeconds: number) {
    return this.mutate((db) => {
      const now = Date.now();
      const b = db.rateLimits[key];
      if (!b || now - b.windowStart > windowSeconds * 1000) db.rateLimits[key] = { windowStart: now, hits: 1 };
      else b.hits++;
      if (Math.random() < 0.02) for (const [k, v] of Object.entries(db.rateLimits)) if (now - v.windowStart > 86_400_000) delete db.rateLimits[k];
      return db.rateLimits[key].hits <= limit;
    });
  }
  async health() {
    await this.read();
  }

  // ---------- uploads ----------
  async saveUpload(upload: Upload) {
    this.requireAdmin();
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
      return { name, data: new Uint8Array(data), contentType };
    } catch {
      return null;
    }
  }
}
