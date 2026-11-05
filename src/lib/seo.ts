import type { Activity, FaqItem, Location, Post, SiteSettings, SlotWithStats } from "./data/types";
import { SCHEMA_DAYS } from "./format";
import { DEFAULT_DESCRIPTION, SERVICE_AREA, SITE_NAME, SITE_URL } from "./site";
import { zagrebDate } from "./data/rules";

const ORG_ID = `${SITE_URL}/#organizacija`;
const isRealProfile = (u: string) => !!u && !/^https:\/\/www\.(instagram|facebook)\.com\/?$/.test(u);

export function organizationLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    description: DEFAULT_DESCRIPTION,
    telephone: settings.phone,
    email: settings.email,
    sameAs: [settings.instagramUrl, settings.facebookUrl].filter(isRealProfile),
    areaServed: SERVICE_AREA.map((name) => ({ "@type": "Place", name })),
  };
}

/** Parse "Pon–Pet: 16:00–20:30" lines into OpeningHoursSpecification (best effort). */
function openingHours(hours: string) {
  const days = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];
  const out: { "@type": string; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const line of hours.split("\n")) {
    const m = line.match(/^\s*(Pon|Uto|Sri|Čet|Pet|Sub|Ned)\w*\s*(?:[–-]\s*(Pon|Uto|Sri|Čet|Pet|Sub|Ned)\w*)?\s*:\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    const from = days.indexOf(m[1]);
    const to = m[2] ? days.indexOf(m[2]) : from;
    const list = days.slice(from, to + 1).map((_, i) => SCHEMA_DAYS[(from + i + 1) as 1]);
    out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: list, opens: m[3].padStart(5, "0"), closes: m[4].padStart(5, "0") });
  }
  return out;
}

export function locationLd(location: Location, settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    "@id": `${SITE_URL}/lokacije#${location.slug}`,
    name: `Sportaonica ${location.name}`,
    description: location.description,
    url: `${SITE_URL}/lokacije#${location.slug}`,
    image: `${SITE_URL}/opengraph-image`,
    telephone: settings.phone,
    email: settings.email,
    parentOrganization: { "@id": ORG_ID },
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address,
      postalCode: location.postalCode,
      addressLocality: location.city,
      addressCountry: "HR",
    },
    geo: { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng },
    hasMap: location.mapUrl,
    openingHoursSpecification: openingHours(location.hours),
  };
}

export function faqLd(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Weekly groups → Event with eventSchedule; dated sessions → plain Event. */
export function slotEventsLd(slots: SlotWithStats[], activities: Activity[], locations: Location[]) {
  const today = zagrebDate();
  const nextDate = (dow: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    const cur = ((d.getUTCDay() + 6) % 7) + 1;
    d.setUTCDate(d.getUTCDate() + ((dow - cur + 7) % 7));
    return d.toISOString().slice(0, 10);
  };
  return slots.slice(0, 40).map((s) => {
    const a = activities.find((x) => x.id === s.activityId);
    const l = locations.find((x) => x.id === s.locationId);
    const start = s.kind === "single" && s.date ? s.date : nextDate(s.dayOfWeek);
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: `${a?.name ?? "Trening"}, ${l?.name ?? ""}`,
      description: a?.shortDescription,
      startDate: `${start}T${s.startTime}`,
      endDate: `${start}T${s.endTime}`,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(s.kind === "weekly"
        ? {
            eventSchedule: {
              "@type": "Schedule",
              byDay: SCHEMA_DAYS[s.dayOfWeek],
              startTime: s.startTime,
              endTime: s.endTime,
              repeatFrequency: "P1W",
              ...(s.validFrom ? { startDate: s.validFrom } : {}),
              ...(s.validTo ? { endDate: s.validTo } : {}),
              scheduleTimezone: "Europe/Zagreb",
            },
          }
        : {}),
      typicalAgeRange: a ? (a.ageMax == null ? `${a.ageMin}-` : `${a.ageMin}-${a.ageMax}`) : undefined,
      maximumAttendeeCapacity: s.capacity,
      remainingAttendeeCapacity: s.remaining,
      location: l && {
        "@type": "SportsActivityLocation",
        name: `Sportaonica ${l.name}`,
        address: { "@type": "PostalAddress", streetAddress: l.address, postalCode: l.postalCode, addressLocality: l.city, addressCountry: "HR" },
      },
      organizer: { "@type": "SportsOrganization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL },
      url: `${SITE_URL}/upisi?termin=${s.id}`,
    };
  });
}

export function articleLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: [post.coverImage, ...post.images.map((i) => i.src)].filter(Boolean).map((src) => (src!.startsWith("http") ? src : `${SITE_URL}${src}`)),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: `${SITE_URL}/novosti/${post.slug}`,
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Početna", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}
