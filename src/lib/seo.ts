import type { Activity, FaqItem, Location, SiteSettings, SlotWithStats } from "./data/types";
import { SCHEMA_DAYS } from "./format";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

const ORG_ID = `${SITE_URL}/#organizacija`;

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
    sport: ["Univerzalna sportska škola", "Rukomet"],
    sameAs: [settings.instagramUrl, settings.facebookUrl].filter((u) => u && !/^https:\/\/www\.(instagram|facebook)\.com\/?$/.test(u)),
    areaServed: ["Božjakovina", "Brckovljani", "Sesvetski Kraljevec", "Dugo Selo"].map((name) => ({ "@type": "Place", name })),
  };
}

export function locationLd(location: Location, slots: SlotWithStats[], settings: SiteSettings) {
  const own = slots.filter((s) => s.locationId === location.id);
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": `${SITE_URL}/lokacije#${location.slug}`,
    name: `Sportaonica — ${location.name}`,
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
    openingHoursSpecification: own.map((s) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAYS[s.dayOfWeek],
      opens: s.startTime,
      closes: s.endTime,
    })),
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

/** Recurring weekly training as schema.org Event with an eventSchedule. */
export function slotEventsLd(slots: SlotWithStats[], activities: Activity[], locations: Location[]) {
  const nextDate = (dow: number) => {
    const d = new Date();
    const diff = (dow - ((d.getDay() + 6) % 7 + 1) + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };
  return slots.map((s) => {
    const a = activities.find((x) => x.id === s.activityId);
    const l = locations.find((x) => x.id === s.locationId);
    const start = nextDate(s.dayOfWeek);
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: `${a?.name ?? "Trening"} — ${l?.name ?? ""}`,
      description: a?.shortDescription,
      startDate: `${start}T${s.startTime}`,
      endDate: `${start}T${s.endTime}`,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventSchedule: {
        "@type": "Schedule",
        byDay: SCHEMA_DAYS[s.dayOfWeek],
        startTime: s.startTime,
        endTime: s.endTime,
        repeatFrequency: "P1W",
        scheduleTimezone: "Europe/Zagreb",
      },
      typicalAgeRange: a ? `${a.ageMin}-${a.ageMax}` : undefined,
      maximumAttendeeCapacity: s.capacity,
      remainingAttendeeCapacity: s.remaining,
      location: l && {
        "@type": "SportsActivityLocation",
        name: `Sportaonica — ${l.name}`,
        address: { "@type": "PostalAddress", streetAddress: l.address, postalCode: l.postalCode, addressLocality: l.city, addressCountry: "HR" },
      },
      organizer: { "@type": "SportsOrganization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL },
      url: `${SITE_URL}/upisi?termin=${s.id}`,
    };
  });
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
