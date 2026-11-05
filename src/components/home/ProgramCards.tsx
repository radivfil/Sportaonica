import Link from "next/link";
import type { Activity, SlotWithStats } from "@/lib/data/types";
import { ageRangeLabel } from "@/lib/data/rules";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ActivityIcon, COLOR_CLASSES } from "./ActivityIcon";

/** Compact programme cards for the home page; details & booking live on /aktivnosti. */
export function ProgramCards({ activities, slots }: { activities: Activity[]; slots: SlotWithStats[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {activities.map((a, i) => {
        const c = COLOR_CLASSES[a.color];
        const own = slots.filter((s) => s.activityId === a.id);
        const free = own.reduce((n, s) => n + s.remaining, 0);
        return (
          <Reveal as="li" key={a.id} delay={(i % 3) * 0.06}>
            <article className="lift card group relative flex h-full min-w-0 flex-col overflow-hidden p-6">
              <div aria-hidden="true" className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${c.bg} opacity-70 transition-transform duration-500 group-hover:scale-110`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className={`rounded-[1.5rem] ${c.soft} p-1.5 ring-2 ${c.ring}`}>
                  <ActivityIcon icon={a.icon} color={a.color} className="h-16 w-16" />
                </div>
                <span className="shrink-0 rounded-full bg-navy px-3 py-1 text-sm font-extrabold text-white">{ageRangeLabel(a)}</span>
              </div>
              <h3 className="relative mt-4 text-xl font-extrabold [hyphens:auto] [overflow-wrap:break-word]">{a.name}</h3>
              <p className="relative mt-2 flex-1 leading-relaxed text-ink-soft">{a.shortDescription}</p>
              <div className="relative mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
                {a.withParent && <span className="rounded-full bg-butter-100 px-2.5 py-0.5 text-ink">Uz roditelja</span>}
                {own.length > 0 && free > 0 && free <= 5 && <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-coral-700">Zadnja mjesta</span>}
                {own.length === 0 && <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-ink-soft">Termini uskoro</span>}
              </div>
              <Link href={`/aktivnosti#${a.slug}`} className="btn-navy relative mt-5 !min-h-[48px]" aria-label={`Termini i prijava: ${a.name}`}>
                Termini i prijava <Icon name="arrow-right" />
              </Link>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}
