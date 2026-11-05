import "server-only";
import type { Repository } from "./data";
import type { Activity, Location, Registration, SlotWithStats } from "./data/types";
import { WEEKDAYS_SHORT, formatYmd } from "./format";

export { STATUS_LABEL } from "./status";

export async function lookups(repo: Repository) {
  const [activities, locations, slots] = await Promise.all([
    repo.listActivities({ includeArchived: true }),
    repo.listLocations(),
    repo.listSlots({ includeArchived: true }),
  ]);
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const locMap = new Map(locations.map((l) => [l.id, l]));
  const slotMap = new Map(slots.map((s) => [s.id, s]));
  const slotLabel = (s: SlotWithStats | undefined) =>
    s
      ? `${actMap.get(s.activityId)?.name ?? "?"} · ${locMap.get(s.locationId)?.name ?? "?"} · ${WEEKDAYS_SHORT[s.dayOfWeek]}${s.date ? ` ${formatYmd(s.date)}` : ""} ${s.startTime}`
      : "—";
  return { activities, locations, slots, actMap, locMap, slotMap, slotLabel };
}

export type Lookups = Awaited<ReturnType<typeof lookups>>;
export type { Activity, Location, Registration };
