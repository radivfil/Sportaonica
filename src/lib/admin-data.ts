import "server-only";
import { repo } from "./data";
import type { Activity, Location, SlotWithStats } from "./data/types";
import { WEEKDAYS_SHORT } from "./format";

export async function lookups() {
  const [activities, locations, slots] = await Promise.all([
    repo().listActivities({ includeArchived: true }),
    repo().listLocations(),
    repo().listSlots({ includeArchived: true }),
  ]);
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const locMap = new Map(locations.map((l) => [l.id, l]));
  const slotMap = new Map(slots.map((s) => [s.id, s]));
  const slotLabel = (s: SlotWithStats | undefined) =>
    s ? `${actMap.get(s.activityId)?.name ?? "?"} · ${locMap.get(s.locationId)?.name ?? "?"} · ${WEEKDAYS_SHORT[s.dayOfWeek]} ${s.startTime}` : "—";
  return { activities, locations, slots, actMap, locMap, slotMap, slotLabel };
}

export type Lookups = Awaited<ReturnType<typeof lookups>>;
export type { Activity, Location };
