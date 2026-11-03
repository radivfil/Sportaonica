import Link from "next/link";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { WEEKDAYS_SHORT, seatsLabel } from "@/lib/format";
import { FillBar } from "@/components/booking/FillBar";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

/** Server-rendered weekly overview with live availability; links into the booking flow. */
export function ScheduleTeaser({ slots, activities, locations }: { slots: SlotWithStats[]; activities: Activity[]; locations: Location[] }) {
  const act = new Map(activities.map((a) => [a.id, a]));
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {locations.map((loc, li) => {
        const own = slots.filter((s) => s.locationId === loc.id && act.has(s.activityId));
        return (
          <Reveal key={loc.id} delay={li * 0.08}>
            <section aria-labelledby={`sched-${loc.slug}`} className="card h-full p-5 sm:p-6">
              <h3 id={`sched-${loc.slug}`} className="flex items-center gap-2 text-xl font-extrabold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-100">
                  <Icon name="pin" className="h-5 w-5 text-coral" />
                </span>
                {loc.name}
              </h3>
              <ul className="mt-4 grid gap-2.5">
                {own.map((s) => {
                  const a = act.get(s.activityId)!;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/upisi?termin=${s.id}`}
                        className="group block rounded-2xl border-2 border-transparent bg-cream p-3.5 transition hover:border-navy/20 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold leading-tight text-ink">{a.name}</p>
                            <p className="mt-0.5 text-sm font-semibold text-ink-soft">
                              {WEEKDAYS_SHORT[s.dayOfWeek]} · {s.startTime}–{s.endTime} · {a.ageMin}–{a.ageMax} god.
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                              s.isFull ? "bg-coral-100 text-coral-700" : s.remaining <= 3 ? "bg-peach-100 text-ink" : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {s.isFull ? "Popunjeno" : `${s.remaining} slob.`}
                          </span>
                        </div>
                        <FillBar taken={s.taken} capacity={s.capacity} className="mt-2.5" />
                        <span className="sr-only">{seatsLabel(s.remaining)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        );
      })}
    </div>
  );
}
