import type { Registration, Slot, SlotWithStats } from "./types";

export function withStats(slot: Slot, registrations: Registration[]): SlotWithStats {
  let confirmedCount = 0;
  let waitlistCount = 0;
  for (const r of registrations) {
    if (r.slotId !== slot.id) continue;
    if (r.status === "confirmed") confirmedCount++;
    else if (r.status === "waitlist") waitlistCount++;
  }
  const taken = slot.preEnrolled + confirmedCount;
  const remaining = Math.max(0, slot.capacity - taken);
  return { ...slot, confirmedCount, waitlistCount, taken, remaining, isFull: remaining === 0 };
}

export function sortSlots<T extends Slot>(slots: T[]): T[] {
  return [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
}

/** Oldest waitlist entry for a slot (FIFO). */
export function nextInWaitlist(registrations: Registration[], slotId: string): Registration | undefined {
  return registrations
    .filter((r) => r.slotId === slotId && r.status === "waitlist")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function waitlistPosition(registrations: Registration[], reg: Registration): number | null {
  if (reg.status !== "waitlist") return null;
  const list = registrations
    .filter((r) => r.slotId === reg.slotId && r.status === "waitlist")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return list.findIndex((r) => r.id === reg.id) + 1;
}
