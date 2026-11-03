import { z } from "zod";

const phoneRe = /^[+]?[\d\s/()-]{6,20}$/;
const trimmed = (max: number) => z.string().trim().max(max);

export const SOURCES = ["Facebook", "Instagram", "Preporuka prijatelja", "Letak", "Vrtić / škola", "Google", "Drugo"] as const;

export const registrationSchema = z.object({
  slotId: z.string().min(1, { message: "Odaberite termin." }),
  parentName: trimmed(120).min(3, { message: "Upišite ime i prezime roditelja." }),
  phone: z.string().trim().regex(phoneRe, { message: "Upišite ispravan broj telefona." }),
  email: z.string().trim().toLowerCase().email({ message: "Upišite ispravnu e-mail adresu." }).max(160),
  childName: trimmed(120).min(2, { message: "Upišite ime i prezime djeteta." }),
  childBirthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Upišite datum rođenja djeteta." })
    .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) < new Date(), { message: "Datum rođenja nije ispravan." }),
  healthNote: trimmed(600).optional().default(""),
  source: trimmed(60).optional().default(""),
  gdprConsent: z.literal(true, { message: "Za prijavu je potrebna privola za obradu podataka." }),
  marketingConsent: z.boolean().optional().default(false),
  waitlist: z.boolean().optional().default(false),
  // anti-spam
  website: z.string().max(0, { message: "Spam." }).optional().default(""), // honeypot
  startedAt: z.number().optional(),
  turnstileToken: z.string().optional(),
});
export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;

export const contactSchema = z.object({
  name: trimmed(120).min(2, { message: "Upišite ime." }),
  email: z.string().trim().toLowerCase().email({ message: "Upišite ispravnu e-mail adresu." }).max(160),
  phone: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || phoneRe.test(v), { message: "Broj telefona nije ispravan." }),
  message: trimmed(3000).min(10, { message: "Poruka je prekratka (najmanje 10 znakova)." }),
  privacy: z.literal(true, { message: "Potrebna je privola za obradu podataka." }),
  website: z.string().max(0).optional().default(""),
  startedAt: z.number().optional(),
  turnstileToken: z.string().optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

/** Flatten zod issues to { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Bots submit instantly; humans need at least a couple of seconds. */
export function looksAutomated(startedAt?: number, minMs = 2500): boolean {
  if (!startedAt) return false;
  return Date.now() - startedAt < minMs;
}

// ---------- admin schemas ----------
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Vrijeme u obliku HH:MM." });

export const activitySchema = z
  .object({
    id: z.string().optional(),
    name: trimmed(80).min(2, { message: "Upišite naziv." }),
    slug: trimmed(80).optional().default(""),
    shortDescription: trimmed(240).min(10, { message: "Kratki opis je obavezan." }),
    description: trimmed(3000).default(""),
    ageMin: z.coerce.number().int().min(2).max(18),
    ageMax: z.coerce.number().int().min(2).max(18),
    icon: z.enum(["universal", "handball", "ball", "obstacle"]),
    color: z.enum(["pink", "teal", "butter", "sky"]),
    status: z.enum(["active", "archived"]),
    order: z.coerce.number().int().default(0),
  })
  .refine((a) => a.ageMax >= a.ageMin, { message: "Gornja dob mora biti veća ili jednaka donjoj.", path: ["ageMax"] });

export const slotSchema = z
  .object({
    id: z.string().optional(),
    activityId: z.string().min(1, { message: "Odaberite aktivnost." }),
    locationId: z.string().min(1, { message: "Odaberite lokaciju." }),
    dayOfWeek: z.coerce.number().int().min(1).max(7),
    startTime: time,
    endTime: time,
    capacity: z.coerce.number().int().min(1, { message: "Kapacitet mora biti barem 1." }).max(200),
    preEnrolled: z.coerce.number().int().min(0).max(200).default(0),
    status: z.enum(["active", "archived"]),
    note: trimmed(200).optional(),
  })
  .refine((s) => s.endTime > s.startTime, { message: "Kraj mora biti nakon početka.", path: ["endTime"] })
  .refine((s) => s.preEnrolled <= s.capacity, { message: "Već upisanih ne može biti više od kapaciteta.", path: ["preEnrolled"] });

export const postSchema = z.object({
  id: z.string().optional(),
  title: trimmed(140).min(3, { message: "Upišite naslov." }),
  slug: trimmed(100).optional().default(""),
  excerpt: trimmed(300).default(""),
  contentHtml: z.string().max(200_000).default(""),
  coverImage: trimmed(500).optional(),
  coverAlt: trimmed(200).optional(),
  status: z.enum(["draft", "published"]),
  seoTitle: trimmed(70).optional(),
  seoDescription: trimmed(170).optional(),
});
