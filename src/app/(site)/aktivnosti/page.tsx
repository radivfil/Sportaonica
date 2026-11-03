import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { ActivityIcon, COLOR_CLASSES } from "@/components/home/ActivityIcon";
import { Benefits } from "@/components/home/Benefits";
import { Icon } from "@/components/ui/Icon";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Reveal } from "@/components/ui/Reveal";
import { getActivities, getLocations, getSlots } from "@/lib/queries";
import { WEEKDAYS, seatsLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Aktivnosti — univerzalna sportska škola, mini rukomet, igre s loptom",
  description:
    "Sportske aktivnosti za predškolce i školarce od 3 do 10 godina: univerzalna sportska škola, mini rukomet, igre s loptom i poligon spretnosti u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu.",
  alternates: { canonical: "/aktivnosti" },
};

export default async function ActivitiesPage() {
  const [activities, locations, slots] = await Promise.all([getActivities(), getLocations(), getSlots()]);
  const loc = new Map(locations.map((l) => [l.id, l]));
  return (
    <>
      <PageHero
        title="Aktivnosti za djecu od 3 do 10 godina"
        intro="Svaki program razvija motoriku, tjelesne sposobnosti, koncentraciju i timski duh — prilagođeno dobi djeteta."
        crumbs={[{ name: "Aktivnosti", path: "/aktivnosti" }]}
      />
      <div className="container grid gap-8 py-16">
        {activities.map((a, i) => {
          const c = COLOR_CLASSES[a.color];
          const own = slots.filter((s) => s.activityId === a.id);
          return (
            <Reveal key={a.id}>
              <article id={a.slug} aria-labelledby={`${a.slug}-t`} className="card scroll-mt-28 overflow-hidden lg:grid lg:grid-cols-[320px_1fr]">
                <div className={`flex flex-col items-center justify-center gap-4 ${c.soft} p-8 ${i % 2 ? "lg:order-2" : ""}`}>
                  <ActivityIcon icon={a.icon} color={a.color} className="h-36 w-36" />
                  <span className="rounded-full bg-navy px-4 py-1.5 font-extrabold text-white">
                    {a.ageMin}–{a.ageMax} godina
                  </span>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 id={`${a.slug}-t`} className="text-3xl font-extrabold">{a.name}</h2>
                    <DemoBadge label="Uredivi demo podatak" />
                  </div>
                  <p className="mt-3 text-lg leading-relaxed text-ink-soft">{a.description}</p>
                  <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Termini</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {own.map((s) => (
                      <li key={s.id}>
                        <Link href={`/upisi?termin=${s.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 transition hover:bg-pink-50">
                          <span>
                            <span className="block font-bold text-ink">{loc.get(s.locationId)?.name}</span>
                            <span className="text-sm font-semibold text-ink-soft">
                              {WEEKDAYS[s.dayOfWeek]}, {s.startTime}–{s.endTime}
                            </span>
                          </span>
                          <span className={`shrink-0 text-sm font-extrabold ${s.isFull ? "text-coral-700" : "text-teal-700"}`}>{seatsLabel(s.remaining)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/upisi?aktivnost=${a.slug}`} className="btn-primary mt-6">
                    Prijavi dijete <Icon name="arrow-right" />
                  </Link>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
      <Benefits />
    </>
  );
}
