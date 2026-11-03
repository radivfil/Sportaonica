import Link from "next/link";
import type { Activity, SlotWithStats } from "@/lib/data/types";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { ActivityIcon, COLOR_CLASSES } from "./ActivityIcon";

export function ActivitiesGrid({ activities, slots, headingLevel = "h3" }: { activities: Activity[]; slots: SlotWithStats[]; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {activities.map((a, i) => {
        const c = COLOR_CLASSES[a.color];
        const own = slots.filter((s) => s.activityId === a.id);
        const free = own.reduce((n, s) => n + s.remaining, 0);
        const locationsCount = new Set(own.map((s) => s.locationId)).size;
        return (
          <Reveal as="li" key={a.id} delay={(i % 2) * 0.08}>
            <article id={a.slug} className="lift card group relative flex h-full scroll-mt-28 flex-col overflow-hidden p-6 sm:p-7">
              <div aria-hidden="true" className={`absolute -right-12 -top-12 h-40 w-40 rounded-full ${c.bg} opacity-70 transition-transform duration-500 group-hover:scale-110`} />
              <div className="relative flex items-start justify-between gap-4">
                <div className={`rounded-[1.75rem] ${c.soft} p-2 ring-2 ${c.ring}`}>
                  <ActivityIcon icon={a.icon} color={a.color} className="h-20 w-20" />
                </div>
                <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-extrabold text-white">
                  {a.ageMin}–{a.ageMax} god.
                </span>
              </div>
              <H className="relative mt-5 text-2xl font-extrabold">{a.name}</H>
              <p className="relative mt-2 flex-1 leading-relaxed text-ink-soft">{a.shortDescription}</p>
              <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="pin" className="h-4 w-4 text-coral" /> {locationsCount} {locationsCount === 1 ? "lokacija" : "lokacije"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4 text-coral" /> {own.length} {own.length === 1 ? "termin" : "termina"} tjedno
                </span>
                {free > 0 && free <= 5 && <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-coral-700">Zadnja mjesta!</span>}
              </div>
              <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
                <Link href={`/upisi?aktivnost=${a.slug}`} className="btn-navy !min-h-[48px]" aria-label={`Pogledaj termine: ${a.name}`}>
                  Pogledaj termine <Icon name="arrow-right" />
                </Link>
                <DemoBadge />
              </div>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}
