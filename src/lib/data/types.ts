/** Domain types shared by every repository implementation. */

export type ISODate = string; // e.g. "2026-11-03T10:00:00.000Z"
export type YMD = string; // "2026-11-03"

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = ponedjeljak … 7 = nedjelja

export interface Location {
  id: string;
  slug: string;
  name: string;
  venue: string; // e.g. "Novi tržni centar Brckovljani"
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  mapUrl: string;
  description: string;
  /** Free text, one line per row, e.g. "Pon–Pet: 16:00–20:00". */
  hours: string;
  order: number;
}

export type ActivityIcon = "universal" | "handball" | "ball" | "obstacle" | "toddler" | "pilates" | "functional" | "workshop" | "skates";
export type ActivityColor = "pink" | "teal" | "butter" | "sky";
export type PublishStatus = "active" | "archived";
export type Audience = "kids" | "adults";

export interface Activity {
  id: string;
  slug: string;
  name: string;
  audience: Audience;
  shortDescription: string;
  description: string;
  ageMin: number; // inclusive, full years
  /** inclusive, full years; null = no upper limit (adults) */
  ageMax: number | null;
  /** e.g. "Mini Sportaonica" — a parent takes part together with the child */
  withParent: boolean;
  /** Short facts shown on the compact card ("45 min", "do 12 djece"). */
  keyFacts: string[];
  icon: ActivityIcon;
  color: ActivityColor;
  status: PublishStatus;
  order: number;
}

/**
 * A bookable session ("termin").
 *  - weekly: a group that meets every week on `dayOfWeek` between validFrom and validTo
 *    (enrolment = the whole season, typical for kids' programmes)
 *  - single: one dated session (`date`); generated singles share a `seriesId`
 *    so a parent can book one session or the whole remaining series.
 */
export type SlotKind = "weekly" | "single";

export interface Slot {
  id: string;
  activityId: string;
  locationId: string;
  kind: SlotKind;
  dayOfWeek: Weekday;
  date?: YMD; // single only
  validFrom?: YMD; // weekly only
  validTo?: YMD; // weekly only
  seriesId?: string; // single sessions generated together
  startTime: string; // "17:00"
  endTime: string; // "17:45"
  capacity: number;
  status: PublishStatus;
  note?: string;
}

/** Seats are never stored — always derived from registrations. */
export interface SlotWithStats extends Slot {
  activeCount: number;
  waitlistCount: number;
  remaining: number;
  isFull: boolean;
  /** single: session is over; weekly: validTo is over */
  isPast: boolean;
}

export type RegistrationStatus = "active" | "waitlist" | "cancelled_parent" | "cancelled_admin";
export const OPEN_STATUSES: RegistrationStatus[] = ["active", "waitlist"];
export const isCancelled = (s: RegistrationStatus) => s === "cancelled_parent" || s === "cancelled_admin";

export interface Registration {
  id: string;
  slotId: string;
  status: RegistrationStatus;
  /** Registrations created by one form submit (e.g. a whole series) share the group and the cancel token. */
  groupId: string;
  parentName: string;
  phone: string;
  email: string;
  childName: string; // participant (child, or the adult for adult programmes)
  childBirthDate: YMD;
  healthNote?: string;
  gdprConsent: boolean;
  paid: boolean;
  /** SHA-256 (hex) of the cancel token. The raw token only ever exists in the parent's e-mail. */
  cancelTokenHash: string;
  adminNote?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  cancelledAt?: ISODate;
  promotedAt?: ISODate;
  /** Set when personal data was erased (GDPR request or retention). Row kept for statistics. */
  anonymizedAt?: ISODate;
}

export interface NewRegistration {
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childBirthDate: YMD;
  healthNote?: string;
  gdprConsent: boolean;
}

export type PostStatus = "draft" | "published";

export interface ImageRef {
  src: string;
  alt: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImage?: string;
  coverAlt?: string;
  images: ImageRef[];
  status: PostStatus;
  publishedAt?: ISODate;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const GALLERY_CATEGORIES = ["treninzi", "rodendani", "radionice", "odrasli", "dogadanja"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  treninzi: "Treninzi",
  rodendani: "Rođendani",
  radionice: "Radionice",
  odrasli: "Odrasli",
  dogadanja: "Događanja",
};

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: GalleryCategory;
  width: number;
  height: number;
  order: number;
  createdAt: ISODate;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  bio: string; // plain text, paragraphs separated by blank lines
  highlights: string[];
  photo?: string;
  photoAlt?: string;
}

export interface AboutContent {
  heading: string;
  intro: string;
  people: Person[];
}

export interface BirthdayPackage {
  id: string;
  name: string;
  description: string;
  priceNote: string;
}

export interface BirthdayContent {
  intro: string;
  packages: BirthdayPackage[];
}

export interface SiteContent {
  faq: FaqItem[];
  about: AboutContent;
  birthdays: BirthdayContent;
  pricingNote: string;
}

export interface SiteSettings {
  phone: string;
  email: string;
  instagramUrl: string;
  facebookUrl: string;
  bannerEnabled: boolean;
  bannerText: string;
  /** Parents can cancel via link until X hours before a dated session. */
  cancelDeadlineHours: number;
  /** Personal data of finished/cancelled registrations is anonymised after X months. */
  retentionMonths: number;
  business: {
    name: string;
    owner: string;
    oib: string;
    address: string;
  };
}

export type InquiryType = "contact" | "birthday";
export interface Inquiry {
  id: string;
  type: InquiryType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** birthday only */
  eventDate?: YMD;
  childrenCount?: number;
  childAge?: number;
  handled: boolean;
  createdAt: ISODate;
}
export type NewInquiry = Omit<Inquiry, "id" | "createdAt" | "handled">;

export interface RegistrationFilter {
  activityId?: string;
  locationId?: string;
  slotId?: string;
  status?: RegistrationStatus;
  q?: string;
  groupId?: string;
}

/** What one booking request asks for: one slot, or several slots of a series. */
export interface BookingRequest {
  slotIds: string[];
  input: NewRegistration;
  cancelTokenHash: string;
  allowWaitlist: boolean;
  /** admin only (enforced by the database) */
  admin?: { force?: boolean; ignoreAge?: boolean; paid?: boolean; adminNote?: string };
}

export type BookingErrorCode = "SLOT_FULL" | "SLOT_NOT_FOUND" | "SLOT_INACTIVE" | "DUPLICATE" | "AGE_OUT_OF_RANGE" | "INVALID";
export interface BookedItem {
  id: string;
  slotId: string;
  status: "active" | "waitlist";
  waitlistPosition: number | null;
}
export type BookingResult =
  | { ok: true; groupId: string; registrations: BookedItem[] }
  | { ok: false; code: BookingErrorCode; slotId?: string };

export interface CancelResult {
  /** ids of registrations cancelled now */
  cancelled: string[];
  /** ids that could not be cancelled because the deadline passed */
  tooLate: string[];
  /** number of waitlisted registrations promoted as a result */
  promoted: number;
}

export interface Upload {
  name: string;
  contentType: string;
  data: Uint8Array;
}

export type AuditAction =
  | "registration.create"
  | "registration.update"
  | "registration.cancel"
  | "registration.move"
  | "registration.promote"
  | "registration.anonymize"
  | "registration.export"
  | "registration.export_child"
  | "attendance.print"
  | "auth.login"
  | "auth.logout";

export interface AuditEntry {
  id: string;
  at: ISODate;
  actor: string;
  action: AuditAction;
  entityId?: string;
  details?: string;
}

export type OutboxKind = "confirmation" | "cancellation" | "promoted" | "owner_new_registration" | "owner_new_inquiry" | "owner_email_quota";
export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  /** group id (confirmation/cancellation), registration id (promoted), inquiry id, or day (quota) */
  refId: string;
  attempts: number;
  nextAttemptAt?: ISODate;
  lastError?: string;
  createdAt: ISODate;
  sentAt?: ISODate;
}
