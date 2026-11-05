/**
 * Pure booking rules shared by the JSON store, the UI and tests.
 * The Supabase implementation enforces the same rules in SQL
 * (supabase/migrations/*_functions.sql) — keep both in sync.
 */
import type { Activity, Registration, Slot, SlotWithStats, Weekday } from "./types";

export const TZ = "Europe/Zagreb";

/** YYYY-MM-DD of `d` in Europe/Zagreb. */
export function zagrebDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** UTC instant of a wall-clock time in Europe/Zagreb (handles DST). */
export function zagrebInstant(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asLocal - guess));
}

/** Age in full years on `ref` (YYYY-MM-DD strings, no time zone drift). */
export function ageYears(birth: string, ref: string = zagrebDate()): number {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
}

export function isAgeAllowed(activity: Pick<Activity, "ageMin" | "ageMax">, birth: string, ref?: string): boolean {
  const age = ageYears(birth, ref);
  return age >= activity.ageMin && (activity.ageMax == null || age <= activity.ageMax);
}

export function ageRangeLabel(a: Pick<Activity, "ageMin" | "ageMax" | "audience">): string {
  if (a.ageMax == null) return a.audience === "adults" && a.ageMin >= 18 ? "Odrasli" : `${a.ageMin}+ god.`;
  return `${a.ageMin}–${a.ageMax} god.`;
}

export function isSlotPast(slot: Slot, today: string = zagrebDate()): boolean {
  if (slot.kind === "single") return !!slot.date && slot.date < today;
  return !!slot.validTo && slot.validTo < today;
}

export function slotStartsAt(slot: Slot): Date | null {
  return slot.kind === "single" && slot.date ? zagrebInstant(slot.date, slot.startTime) : null;
}

/** Parents may cancel weekly groups any time; dated sessions until X hours before start. */
export function canCancelByLink(slot: Slot, deadlineHours: number, now: Date = new Date()): boolean {
  const start = slotStartsAt(slot);
  if (!start) return true;
  return start.getTime() - deadlineHours * 3600_000 > now.getTime();
}

export function withStats(slot: Slot, registrations: Registration[], today?: string): SlotWithStats {
  let activeCount = 0;
  let waitlistCount = 0;
  for (const r of registrations) {
    if (r.slotId !== slot.id) continue;
    if (r.status === "active") activeCount++;
    else if (r.status === "waitlist") waitlistCount++;
  }
  const remaining = Math.max(0, slot.capacity - activeCount);
  return { ...slot, activeCount, waitlistCount, remaining, isFull: remaining === 0, isPast: isSlotPast(slot, today) };
}

export function sortSlots<T extends Slot>(slots: T[]): T[] {
  return [...slots].sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") || a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id),
  );
}

export const normName = (s: string) => s.trim().toLowerCase();

export function isDuplicate(registrations: Registration[], slotId: string, childName: string, birth: string): boolean {
  const n = normName(childName);
  return registrations.some(
    (r) => r.slotId === slotId && (r.status === "active" || r.status === "waitlist") && !r.anonymizedAt && normName(r.childName) === n && r.childBirthDate === birth,
  );
}

export function waitlistQueue(registrations: Registration[], slotId: string): Registration[] {
  return registrations
    .filter((r) => r.slotId === slotId && r.status === "waitlist")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function weekdayOf(ymd: string): Weekday {
  const [y, m, d] = ymd.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as Weekday;
}

/** Dates (YYYY-MM-DD) between from..to (inclusive) that fall on one of `days`. */
export function datesInRange(from: string, to: string, days: Weekday[]): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 400; i++) {
    const ymd = cur.toISOString().slice(0, 10);
    if (ymd > to) break;
    if (days.includes(weekdayOf(ymd))) out.push(ymd);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Remaining (not past) sessions of the same series, in date order. */
export function remainingSeries<T extends Slot>(slots: T[], seriesId: string, today: string = zagrebDate()): T[] {
  return sortSlots(slots.filter((s) => s.seriesId === seriesId && s.status === "active" && !isSlotPast(s, today)));
}
