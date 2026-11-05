import Link from "next/link";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { ageRangeLabel, sortSlots } from "@/lib/data/rules";
import { WEEKDAYS, formatYmd, plural, seatsLabel } from "@/lib/format";
import { ActivityIcon, COLOR_CLASSES } from "@/components/home/ActivityIcon";
import { Icon } from "@/components/ui/Icon";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { STATIC_DEMO } from "@/lib/site";

/**
 * Programme list in the style of a sports-school timetable:
 *  desktop → two columns (compact facts card | title, description, sessions)
 *  mobile  → one column, sessions under the description, big buttons.
 * Every session row: day/date · time · location · free seats · "Prijavi".
 */
export function ActivitySchedule({
  activities,
  slots,
  locations,
  headingLevel = "h2",
}: {
  activities: Activity[];
  slots: SlotWithStats[];
  locations: Location[];
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const loc = new Map(locations.map((l) => [l.id, l]));
  if (!activities.length) return <p className="card p-8 text-center text-ink-soft">Za odabrane filtre trenutno nema programa.</p>;
  return (
    <ul className="grid gap-8">
      {activities.map((a) => {
        const c = COLOR_CLASSES[a.color];
        const own = sortSlots(slots.filter((s) => s.activityId === a.id));
        const where = [...new Set(own.map((s) => loc.get(s.locationId)?.name).filter(Boolean))] as string[];
        const series = new Map<string, SlotWithStats[]>();
        for (const s of own) if (s.seriesId) series.set(s.seriesId, [...(series.get(s.seriesId) ?? []), s]);
        return (
          <li key={a.id} id={a.slug} className="scroll-mt-28">
            <article aria-labelledby={`${a.slug}-t`} className="card grid overflow-hidden md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
              {/* compact card */}
              <div className={`${c.soft} flex flex-col gap-4 p-5 sm:p-6`}>
                <div className="flex items-center gap-4 md:flex-col md:items-start">
                  <div className={`shrink-0 rounded-[1.75rem] bg-white/70 p-1.5 ring-2 ${c.ring}`}>
                    <ActivityIcon icon={a.icon} color={a.color} className="h-16 w-16 md:h-20 md:w-20" />
                  </div>
                  <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-extrabold text-white">{ageRangeLabel(a)}</span>
                </div>
                <dl className="grid gap-2 text-sm font-semibold text-ink">
                  <div className="flex items-start gap-2">
                    <dt className="sr-only">Za koga</dt>
                    <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                    <dd className="min-w-0">{a.audience === "adults" ? "Program za odrasle" : a.withParent ? "Dijete uz roditelja" : "Program za djecu"}</dd>
                  </div>
                  {where.length > 0 && (
                    <div className="flex items-start gap-2">
                      <dt className="sr-only">Lokacije</dt>
                      <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                      <dd className="min-w-0">{where.join(" · ")}</dd>
                    </div>
                  )}
                  {a.keyFacts.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <dt className="sr-only">Podatak</dt>
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      <dd className="min-w-0 [overflow-wrap:anywhere]">{f}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* title, description, sessions */}
              <div className="min-w-0 p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <H id={`${a.slug}-t`} className="min-w-0 text-2xl font-extrabold [overflow-wrap:anywhere] [hyphens:auto] sm:text-3xl">
                    {a.name}
                  </H>
                  <DemoBadge />
                </div>
                <p className="mt-2 leading-relaxed text-ink-soft [overflow-wrap:anywhere]">{a.description || a.shortDescription}</p>

                <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Termini</h3>
                {own.length === 0 ? (
                  <p className="mt-2 rounded-2xl bg-cream p-4 text-ink-soft">
                    Trenutno nema objavljenih termina. <Link href="/kontakt" className="font-bold text-navy underline">Javite nam se</Link> i obavijestit ćemo vas.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2.5">
                    {[...series.entries()].map(([id, list]) => {
                      const free = Math.min(...list.map((s) => s.remaining));
                      return (
                        <li key={id}>
                          <SessionRow
                            primary={`Cijela serija · ${list.length} ${plural(list.length, "termin", "termina", "termina")}`}
                            secondary={`${WEEKDAYS[list[0].dayOfWeek]}, od ${formatYmd(list[0].date!)} · ${list[0].startTime}–${list[0].endTime}`}
                            location={loc.get(list[0].locationId)?.name ?? ""}
                            remaining={free}
                            href={`/upisi?termin=${list[0].id}&serija=1`}
                            waitlistHref={`/upisi?termin=${list[0].id}&serija=1&cekanje=1`}
                            label={`${a.name}, cijela serija`}
                            highlight
                          />
                        </li>
                      );
                    })}
                    {own.map((s) => (
                      <li key={s.id}>
                        <SessionRow
                          primary={s.kind === "single" && s.date ? `${WEEKDAYS[s.dayOfWeek]}, ${formatYmd(s.date)}` : WEEKDAYS[s.dayOfWeek]}
                          secondary={`${s.startTime}–${s.endTime}${s.kind === "weekly" ? " · svaki tjedan" : ""}`}
                          location={loc.get(s.locationId)?.name ?? ""}
                          remaining={s.remaining}
                          href={`/upisi?termin=${s.id}`}
                          waitlistHref={`/upisi?termin=${s.id}&cekanje=1`}
                          label={`${a.name}, ${WEEKDAYS[s.dayOfWeek]} ${s.startTime}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function SessionRow(p: {
  primary: string;
  secondary: string;
  location: string;
  remaining: number;
  href: string;
  waitlistHref: string;
  label: string;
  highlight?: boolean;
}) {
  const full = p.remaining === 0;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-3.5 sm:p-4 ${p.highlight ? "bg-sky-50 ring-1 ring-sky-200" : "bg-cream"}`}
      data-testid="session-row"
    >
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-extrabold leading-tight text-ink [overflow-wrap:anywhere]">{p.primary}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink-soft">
          {p.secondary}
          <span aria-hidden="true"> · </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" className="h-3.5 w-3.5 text-coral" />
            {p.location}
          </span>
        </p>
      </div>
      <p className={`shrink-0 text-sm font-extrabold ${full ? "text-coral-700" : p.remaining <= 3 ? "text-ink" : "text-teal-700"}`}>{seatsLabel(p.remaining)}</p>
      {full ? (
        <Link href={p.waitlistHref} className="btn-secondary !min-h-[48px] w-full shrink-0 whitespace-nowrap !px-5 sm:w-auto" aria-label={`Lista čekanja: ${p.label}`}>
          Lista čekanja
        </Link>
      ) : (
        <Link href={p.href} className="btn-primary !min-h-[48px] w-full shrink-0 whitespace-nowrap !px-5 sm:w-auto" aria-label={`Prijavi: ${p.label}`}>
          Prijavi <Icon name="arrow-right" />
        </Link>
      )}
    </div>
  );
}

/** Filter chips (links → works without JavaScript, shareable URL). */
export function ScheduleFilters({ base, audience, location, locations }: { base: string; audience?: string; location?: string; locations: Location[] }) {
  if (STATIC_DEMO) return null; // filters are server-side; the static preview shows everything
  const href = (a?: string, l?: string) => {
    const q = new URLSearchParams();
    if (a) q.set("za", a);
    if (l) q.set("lokacija", l);
    const s = q.toString();
    return `${base}${s ? `?${s}` : ""}#programi`;
  };
  const chip = (active: boolean) =>
    `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 font-bold transition ${active ? "bg-navy text-white" : "bg-white text-ink ring-1 ring-ink/15 hover:bg-sky-50"}`;
  return (
    <div className="mb-8 grid gap-3" role="group" aria-label="Filtriraj programe">
      <div className="flex flex-wrap gap-2">
        {[
          [undefined, "Svi programi"],
          ["djeca", "Programi za djecu"],
          ["odrasli", "Programi za odrasle"],
        ].map(([v, label]) => (
          <Link key={label} href={href(v, location)} aria-current={audience === v ? "true" : undefined} className={chip(audience === v)}>
            {label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[{ slug: undefined, name: "Sve lokacije" }, ...locations].map((l) => (
          <Link key={l.name} href={href(audience, l.slug)} aria-current={location === l.slug ? "true" : undefined} className={chip(location === l.slug)}>
            {l.slug && <Icon name="pin" className="mr-1.5 h-4 w-4" />}
            {l.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Applies ?za=djeca|odrasli&lokacija=slug to the lists. */
export function applyFilters(activities: Activity[], slots: SlotWithStats[], locations: Location[], za?: string, lokacija?: string) {
  const audience = za === "djeca" ? "kids" : za === "odrasli" ? "adults" : undefined;
  const loc = locations.find((l) => l.slug === lokacija);
  const fSlots = loc ? slots.filter((s) => s.locationId === loc.id) : slots;
  const fActs = activities.filter((a) => (!audience || a.audience === audience) && (!loc || fSlots.some((s) => s.activityId === a.id)));
  return { activities: fActs, slots: fSlots, audience: audience ? za : undefined, location: loc?.slug };
}
