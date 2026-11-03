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

/**
 * Storage-agnostic data access. The demo uses `JsonRepository`; production
 * can switch to `SupabaseRepository` via DATA_PROVIDER=supabase without
 * touching UI code.
 *
 * Booking invariants every implementation MUST guarantee:
 *  - `book` checks capacity and inserts in one atomic step (no overbooking).
 *  - `cancelByToken` / `cancelRegistration` free the seat and promote the
 *    oldest waitlist entry for the same slot in the same atomic step.
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
  listSlots(opts?: { includeArchived?: boolean; activityId?: string; locationId?: string }): Promise<SlotWithStats[]>;
  getSlot(id: string): Promise<SlotWithStats | null>;
  saveSlot(slot: Omit<Slot, "id"> & { id?: string }): Promise<Slot>;
  duplicateSlot(id: string): Promise<Slot>;
  deleteSlot(id: string): Promise<void>;

  // registrations
  listRegistrations(filter?: RegistrationFilter): Promise<Registration[]>;
  getRegistration(id: string): Promise<Registration | null>;
  getRegistrationByToken(token: string): Promise<Registration | null>;
  /** Atomic capacity check + insert. `allowWaitlist` puts the child on the waitlist when full. */
  book(slotId: string, input: NewRegistration, opts: { allowWaitlist: boolean; force?: boolean }): Promise<BookingResult>;
  updateRegistration(id: string, patch: Partial<Omit<Registration, "id" | "cancelToken" | "createdAt">>): Promise<Registration>;
  /** Atomic move to another slot (respects capacity unless force). */
  moveRegistration(id: string, targetSlotId: string, opts?: { force?: boolean }): Promise<BookingResult & { promoted?: Registration | null }>;
  cancelRegistration(id: string): Promise<CancelResult>;
  cancelByToken(token: string): Promise<CancelResult>;
  /** GDPR erasure — permanently removes the record. */
  deleteRegistration(id: string): Promise<void>;

  // posts
  listPosts(opts?: { status?: PostStatus; limit?: number }): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  getPostBySlug(slug: string): Promise<Post | null>;
  savePost(post: Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // contact
  createContactMessage(msg: Omit<ContactMessage, "id" | "createdAt">): Promise<ContactMessage>;
  listContactMessages(): Promise<ContactMessage[]>;

  // uploads
  saveUpload(upload: Upload): Promise<string>; // returns public URL
  getUpload(name: string): Promise<Upload | null>;
}
