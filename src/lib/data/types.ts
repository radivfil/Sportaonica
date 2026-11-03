/** Domain types shared by every repository implementation. */

export type ISODate = string; // e.g. "2026-11-03T10:00:00.000Z"

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = ponedjeljak … 7 = nedjelja

export interface Location {
  id: string;
  slug: string;
  name: string;
  venue: string; // e.g. "Dvorana OŠ …"
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  mapUrl: string;
  description: string;
  order: number;
}

export type ActivityIcon = "universal" | "handball" | "ball" | "obstacle";
export type ActivityColor = "pink" | "teal" | "butter" | "sky";
export type PublishStatus = "active" | "archived";

export interface Activity {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  ageMin: number; // inclusive, years
  ageMax: number; // inclusive, years
  icon: ActivityIcon;
  color: ActivityColor;
  status: PublishStatus;
  order: number;
}

export interface Slot {
  id: string;
  activityId: string;
  locationId: string;
  dayOfWeek: Weekday;
  startTime: string; // "17:00"
  endTime: string; // "17:45"
  capacity: number;
  /** Children already enrolled outside the web system (e.g. returning members). */
  preEnrolled: number;
  status: PublishStatus;
  note?: string;
}

export interface SlotWithStats extends Slot {
  confirmedCount: number;
  waitlistCount: number;
  taken: number; // preEnrolled + confirmed
  remaining: number;
  isFull: boolean;
}

export type RegistrationStatus = "confirmed" | "waitlist" | "cancelled";

export interface Registration {
  id: string;
  slotId: string;
  status: RegistrationStatus;
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childBirthDate: string; // YYYY-MM-DD
  healthNote?: string;
  source?: string;
  gdprConsent: boolean;
  marketingConsent: boolean;
  paid: boolean;
  cancelToken: string;
  adminNote?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  cancelledAt?: ISODate;
}

export type NewRegistration = Omit<
  Registration,
  "id" | "status" | "paid" | "cancelToken" | "createdAt" | "updatedAt" | "cancelledAt"
> & { paid?: boolean; adminNote?: string };

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImage?: string;
  coverAlt?: string;
  status: PostStatus;
  publishedAt?: ISODate;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface TrainerBlock {
  name: string;
  title: string;
  bio: string; // plain text, paragraphs separated by blank lines
  highlights: string[];
  photo?: string;
}

export interface SiteContent {
  faq: FaqItem[];
  trainer: TrainerBlock;
  pricingNote: string;
}

export interface SiteSettings {
  phone: string;
  email: string;
  instagramUrl: string;
  facebookUrl: string;
  bannerEnabled: boolean;
  bannerText: string;
  business: {
    name: string;
    owner: string;
    oib: string;
    address: string;
  };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: ISODate;
}

export interface RegistrationFilter {
  activityId?: string;
  locationId?: string;
  slotId?: string;
  status?: RegistrationStatus;
  q?: string;
}

export type BookingResult =
  | { ok: true; registration: Registration }
  | { ok: false; code: "SLOT_FULL" | "SLOT_NOT_FOUND" | "SLOT_INACTIVE" };

export interface CancelResult {
  cancelled: Registration | null;
  promoted: Registration | null;
  alreadyCancelled?: boolean;
}

export interface Upload {
  name: string;
  contentType: string;
  data: Buffer;
}
