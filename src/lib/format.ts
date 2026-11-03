import type { Weekday } from "./data/types";

export const WEEKDAYS: Record<Weekday, string> = {
  1: "Ponedjeljak",
  2: "Utorak",
  3: "Srijeda",
  4: "Četvrtak",
  5: "Petak",
  6: "Subota",
  7: "Nedjelja",
};
export const WEEKDAYS_SHORT: Record<Weekday, string> = { 1: "Pon", 2: "Uto", 3: "Sri", 4: "Čet", 5: "Pet", 6: "Sub", 7: "Ned" };
export const SCHEMA_DAYS: Record<Weekday, string> = {
  1: "https://schema.org/Monday",
  2: "https://schema.org/Tuesday",
  3: "https://schema.org/Wednesday",
  4: "https://schema.org/Thursday",
  5: "https://schema.org/Friday",
  6: "https://schema.org/Saturday",
  7: "https://schema.org/Sunday",
};

const TZ = "Europe/Zagreb";

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("hr-HR", { timeZone: TZ, ...opts }).format(new Date(iso));
}
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("hr-HR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
export function formatBirthDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}.`;
}

/** Croatian plural: 1 mjesto, 2–4 mjesta, 5+ mjesta (1, 21, 31… → singular) */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function seatsLabel(remaining: number) {
  if (remaining === 0) return "Popunjeno";
  return `Još ${remaining} ${plural(remaining, "slobodno mjesto", "slobodna mjesta", "slobodnih mjesta")}`;
}

export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+385${digits.replace(/^0/, "")}`}`;
}

/** Monday 00:00 of the current week in local time. */
export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
