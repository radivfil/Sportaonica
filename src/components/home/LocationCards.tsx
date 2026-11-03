import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { WEEKDAYS } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { DemoBadge } from "@/components/ui/DemoBadge";

const TINTS = ["#FBCFD6", "#BFE7E4", "#F7EFB5"];

/** Illustrated mini-map (no third-party embed → fast, no tracking cookies). */
function MiniMap({ tint, seed }: { tint: string; seed: number }) {
  const r = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="150" fill={tint} />
      <path d={`M0 ${60 + r(1) * 30}C80 ${40 + r(2) * 40} 160 ${90 + r(3) * 30} 320 ${50 + r(4) * 40}`} stroke="#fff" strokeWidth="14" fill="none" />
      <path d={`M${90 + r(5) * 60} 0C${120 + r(6) * 40} 60 ${70 + r(7) * 60} 100 ${110 + r(8) * 60} 150`} stroke="#fff" strokeWidth="10" fill="none" />
      <path d={`M${220 + r(9) * 40} 0L${200 + r(10) * 40} 150`} stroke="#fff" strokeWidth="7" fill="none" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={20 + r(11 + i) * 270} y={10 + r(20 + i) * 110} width="22" height="16" rx="4" fill="#fff" opacity=".55" />
      ))}
      <circle cx="40" cy="120" r="16" fill="#91D2CE" opacity=".5" />
      <g transform="translate(160 40)">
        <ellipse cx="0" cy="54" rx="14" ry="5" fill="#13385A" opacity=".2" />
        <path d="M0 52s-20-18-20-32a20 20 0 0 1 40 0C20 34 0 52 0 52z" fill="#C2453D" stroke="#2A2F3A" strokeWidth="2.5" />
        <circle cx="0" cy="20" r="7" fill="#fff" />
      </g>
    </svg>
  );
}

export function LocationCards({ locations, slots, activities }: { locations: Location[]; slots: SlotWithStats[]; activities: Activity[] }) {
  const act = new Map(activities.map((a) => [a.id, a]));
  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {locations.map((loc, i) => {
        const own = slots.filter((s) => s.locationId === loc.id && act.has(s.activityId));
        return (
          <Reveal as="li" key={loc.id} delay={i * 0.08}>
            <article id={loc.slug} className="lift card flex h-full scroll-mt-28 flex-col overflow-hidden">
              <div className="relative h-36">
                <MiniMap tint={TINTS[i % TINTS.length]} seed={i + 3} />
                <DemoBadge className="absolute right-3 top-3" label="Adresa: potvrditi" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl font-extrabold">{loc.name}</h3>
                <p className="mt-1 font-semibold text-ink-soft">{loc.venue}</p>
                <address className="mt-3 flex items-start gap-2 not-italic text-ink">
                  <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
                  <span>
                    {loc.address}
                    <br />
                    {loc.postalCode} {loc.city}
                  </span>
                </address>
                <h4 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Raspored</h4>
                <ul className="mt-2 grid gap-1.5 text-[0.95rem]">
                  {own.map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink/10 pb-1.5">
                      <span className="font-bold text-ink">{act.get(s.activityId)!.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        {WEEKDAYS[s.dayOfWeek].slice(0, 3)} {s.startTime}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-2 pt-1">
                  <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !min-h-[44px] flex-1 !px-4 text-base">
                    <Icon name="map" /> Karta
                  </a>
                  <a href={`/upisi?lokacija=${loc.slug}`} className="btn-navy !min-h-[44px] flex-1 !px-4 text-base">
                    Termini
                  </a>
                </div>
              </div>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}
