import { z } from "zod";

const phoneRe = /^[+]?[\d\s/()-]{6,20}$/;
const ymd = /^\d{4}-\d{2}-\d{2}$/;
const trimmed = (max: number) => z.string().trim().max(max);
const validDate = (v: string) => ymd.test(v) && !Number.isNaN(Date.parse(v));

const antiSpam = {
  website: z.string().max(0, { message: "Spam." }).optional().default(""), // honeypot
  startedAt: z.number().optional(),
  turnstileToken: z.string().max(4000).optional(),
};

/** Public booking form. Only what is necessary (data minimisation). */
export const registrationSchema = z.object({
  slotIds: z.array(z.string().min(1).max(64)).min(1, { message: "Odaberite termin." }).max(60),
  parentName: trimmed(120).min(3, { message: "Upišite ime i prezime roditelja." }),
  phone: z.string().trim().regex(phoneRe, { message: "Upišite ispravan broj telefona." }),
  email: z.string().trim().toLowerCase().email({ message: "Upišite ispravnu e-mail adresu." }).max(160),
  childName: trimmed(120).min(3, { message: "Upišite ime i prezime." }),
  childBirthDate: z
    .string()
    .refine(validDate, { message: "Upišite datum rođenja." })
    .refine((v) => new Date(v) < new Date() && v > "1900-01-01", { message: "Datum rođenja nije ispravan." }),
  healthNote: trimmed(600).optional().default(""),
  gdprConsent: z.literal(true, { message: "Za prijavu je potrebna privola za obradu podataka." }),
  waitlist: z.boolean().optional().default(false),
  ...antiSpam,
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
  ...antiSpam,
});
export type ContactInput = z.input<typeof contactSchema>;

export const birthdaySchema = z.object({
  name: trimmed(120).min(2, { message: "Upišite ime i prezime." }),
  email: z.string().trim().toLowerCase().email({ message: "Upišite ispravnu e-mail adresu." }).max(160),
  phone: z.string().trim().regex(phoneRe, { message: "Upišite ispravan broj telefona." }),
  eventDate: z
    .string()
    .refine(validDate, { message: "Odaberite željeni datum." })
    .refine((v) => v >= new Date().toISOString().slice(0, 10), { message: "Datum mora biti u budućnosti." }),
  childrenCount: z.coerce.number().int().min(1, { message: "Upišite broj djece." }).max(100, { message: "Najviše 100 djece." }),
  childAge: z.coerce.number().int().min(1, { message: "Upišite dob slavljenika." }).max(18, { message: "Dob do 18 godina." }),
  message: trimmed(2000).optional().default(""),
  privacy: z.literal(true, { message: "Potrebna je privola za obradu podataka." }),
  ...antiSpam,
});
export type BirthdayInput = z.input<typeof birthdaySchema>;

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
const optDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || validDate(v), { message: "Neispravan datum." });

export const ACTIVITY_ICONS = ["universal", "handball", "ball", "obstacle", "toddler", "pilates", "functional", "workshop", "skates"] as const;

export const activitySchema = z
  .object({
    id: z.string().optional(),
    name: trimmed(80).min(2, { message: "Upišite naziv." }),
    slug: trimmed(80).optional().default(""),
    audience: z.enum(["kids", "adults"]),
    shortDescription: trimmed(240).min(10, { message: "Kratki opis je obavezan (najmanje 10 znakova)." }),
    description: trimmed(3000).default(""),
    ageMin: z.coerce.number().int().min(0, { message: "Donja dob 0–99." }).max(99),
    ageMax: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(99)])
      .transform((v) => (v === "" ? null : v)),
    withParent: z.boolean(),
    keyFacts: z.array(trimmed(40)).max(6),
    icon: z.enum(ACTIVITY_ICONS),
    color: z.enum(["pink", "teal", "butter", "sky"]),
    status: z.enum(["active", "archived"]),
    order: z.coerce.number().int().default(0),
  })
  .refine((a) => a.ageMax == null || a.ageMax >= a.ageMin, { message: "Gornja dob mora biti veća ili jednaka donjoj.", path: ["ageMax"] });

export const slotSchema = z
  .object({
    id: z.string().optional(),
    activityId: z.string().min(1, { message: "Odaberite aktivnost." }),
    locationId: z.string().min(1, { message: "Odaberite lokaciju." }),
    kind: z.enum(["weekly", "single"]),
    dayOfWeek: z.coerce.number().int().min(1).max(7),
    date: optDate,
    validFrom: optDate,
    validTo: optDate,
    seriesId: z.string().max(64).optional(),
    startTime: time,
    endTime: time,
    capacity: z.coerce.number().int().min(1, { message: "Kapacitet mora biti barem 1." }).max(500),
    status: z.enum(["active", "archived"]),
    note: trimmed(200).optional(),
  })
  .refine((s) => s.endTime > s.startTime, { message: "Kraj mora biti nakon početka.", path: ["endTime"] })
  .refine((s) => s.kind === "weekly" || !!s.date, { message: "Pojedinačni termin mora imati datum.", path: ["date"] })
  .refine((s) => !s.validFrom || !s.validTo || s.validTo >= s.validFrom, { message: "Kraj razdoblja mora biti nakon početka.", path: ["validTo"] });

export const seriesSchema = z
  .object({
    activityId: z.string().min(1, { message: "Odaberite aktivnost." }),
    locationId: z.string().min(1, { message: "Odaberite lokaciju." }),
    kind: z.enum(["weekly", "single"]),
    days: z.array(z.coerce.number().int().min(1).max(7)).min(1, { message: "Odaberite barem jedan dan." }),
    from: z.string().refine(validDate, { message: "Odaberite početak razdoblja." }),
    to: z.string().refine(validDate, { message: "Odaberite kraj razdoblja." }),
    startTime: time,
    endTime: time,
    capacity: z.coerce.number().int().min(1).max(500),
  })
  .refine((s) => s.to >= s.from, { message: "Kraj razdoblja mora biti nakon početka.", path: ["to"] })
  .refine((s) => s.endTime > s.startTime, { message: "Kraj mora biti nakon početka.", path: ["endTime"] });

export const postSchema = z.object({
  id: z.string().optional(),
  title: trimmed(140).min(3, { message: "Upišite naslov." }),
  slug: trimmed(100).optional().default(""),
  excerpt: trimmed(300).default(""),
  contentHtml: z.string().max(200_000).default(""),
  coverImage: trimmed(500).optional(),
  coverAlt: trimmed(200).optional(),
  images: z.array(z.object({ src: trimmed(500).min(1), alt: trimmed(200).min(3, { message: "Svaka slika treba opis (alternativni tekst)." }) })).max(40),
  status: z.enum(["draft", "published"]),
  seoTitle: trimmed(70).optional(),
  seoDescription: trimmed(170).optional(),
});

export const adminRegistrationSchema = z.object({
  parentName: trimmed(120).min(3, { message: "Upišite ime roditelja." }),
  phone: z.string().trim().regex(phoneRe, { message: "Neispravan telefon." }),
  email: z.string().trim().toLowerCase().email({ message: "Neispravan e-mail." }).max(160),
  childName: trimmed(120).min(2, { message: "Upišite ime polaznika." }),
  childBirthDate: z.string().refine(validDate, { message: "Upišite datum rođenja." }),
  healthNote: trimmed(600).optional(),
  adminNote: trimmed(2000).optional(),
  paid: z.boolean(),
});
