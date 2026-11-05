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

export type AdminResult = { ok: true; promoted?: number } | { ok: false; code: string };

/**
 * Storage-agnostic data access.
 *  - JsonRepository: local development and tests (file on disk).
 *  - SupabaseRepository: demo and production. One instance per Supabase
 *    client, so the *database* enforces who may do what (RLS):
 *      publicRepo()  → anon key  (catalogue + booking/cancel RPCs only)
 *      adminRepo()   → the owner's own session (needs 2FA / aal2)
 *      systemRepo()  → service role, server-only jobs (outbox, retention)
 *
 * Booking invariants every implementation MUST guarantee:
 *  - free seats = capacity − active registrations (never a stored counter)
 *  - `book` validates and inserts all requested sessions atomically
 *  - cancelling an active seat promotes the oldest waitlist entry in the same step
 *  - every e-mail-worthy event is written to the outbox in the same step
 */
export interface Repository {
  // settings & editable blocks
  getSettings(): Promise<SiteSettings>;
  updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;
  getContent(): Promise<SiteContent>;
  updateContent(patch: Partial<SiteContent>): Promise<SiteContent>;

  // locations
  listLocations(): Promise<Location[]>;
  getLocation(idOrSlug: string): Promise<Location | null>;
  saveLocation(location: Location): Promise<Location>;

  // activities
  listActivities(opts?: { includeArchived?: boolean }): Promise<Activity[]>;
  getActivity(idOrSlug: string): Promise<Activity | null>;
  saveActivity(activity: Omit<Activity, "id"> & { id?: string }): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  // slots
  listSlots(opts?: { includeArchived?: boolean }): Promise<SlotWithStats[]>;
  getSlot(id: string, opts?: { includeArchived?: boolean }): Promise<SlotWithStats | null>;
  saveSlots(slots: (Omit<Slot, "id"> & { id?: string })[]): Promise<Slot[]>;
  deleteSlot(id: string): Promise<void>;

  // registrations (admin)
  listRegistrations(filter?: RegistrationFilter): Promise<Registration[]>;
  getRegistration(id: string): Promise<Registration | null>;
  updateRegistration(id: string, patch: Partial<Pick<Registration, "parentName" | "phone" | "email" | "childName" | "childBirthDate" | "healthNote" | "paid" | "adminNote">>): Promise<void>;
  cancelRegistrationAdmin(id: string): Promise<AdminResult>;
  moveRegistration(id: string, targetSlotId: string, opts?: { force?: boolean }): Promise<AdminResult>;
  promoteRegistration(id: string, opts?: { force?: boolean }): Promise<AdminResult>;
  anonymizeRegistration(id: string): Promise<void>;
  purgeExpired(): Promise<number>;

  // registrations (public)
  book(req: BookingRequest): Promise<BookingResult>;
  /** Minimal view for the parent's cancel page (token holder only). */
  registrationsByToken(token: string): Promise<TokenRegistration[]>;
  cancelByToken(token: string, ids?: string[]): Promise<CancelResult>;

  // posts
  listPosts(opts?: { status?: PostStatus; limit?: number }): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  getPostBySlug(slug: string): Promise<Post | null>;
  savePost(post: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // gallery
  listGallery(): Promise<GalleryImage[]>;
  saveGalleryImage(img: Omit<GalleryImage, "id" | "createdAt"> & { id?: string }): Promise<GalleryImage>;
  deleteGalleryImage(id: string): Promise<void>;
  reorderGallery(ids: string[]): Promise<void>;

  // inquiries (contact + birthday)
  createInquiry(inquiry: NewInquiry): Promise<{ ok: boolean }>;
  listInquiries(): Promise<Inquiry[]>;
  getInquiry(id: string): Promise<Inquiry | null>;
  setInquiryHandled(id: string, handled: boolean): Promise<void>;

  // audit
  audit(action: AuditEntry["action"], entityId?: string, details?: string): Promise<void>;
  listAudit(limit?: number): Promise<AuditEntry[]>;

  // system: outbox, e-mail quota, rate limiting, health
  claimOutbox(limit?: number): Promise<OutboxItem[]>;
  /** error=undefined → sent. retryAt → deferred without spending an attempt (quota). */
  finishOutbox(id: string, error?: string, retryAt?: Date): Promise<void>;
  rotateGroupToken(groupId: string, tokenHash: string): Promise<void>;
  takeEmailQuota(limit: number, warnAt: number): Promise<{ allowed: boolean; sent: number; warn: boolean }>;
  emailUsageToday(): Promise<number>;
  pendingOutboxCount(): Promise<number>;
  rateLimitHit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  health(): Promise<void>;

  // uploads
  saveUpload(upload: Upload): Promise<string>; // returns public URL
  getUpload(name: string): Promise<Upload | null>;
}

export interface TokenRegistration {
  id: string;
  slotId: string;
  status: Registration["status"];
  childName: string;
  groupId: string;
  cancelledAt?: string;
  cancellable: boolean;
}
