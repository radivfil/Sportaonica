import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { ActivitySchedule, ScheduleFilters, applyFilters } from "@/components/schedule/ActivitySchedule";
import { Benefits } from "@/components/home/Benefits";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActivities, getLocations, getSlots } from "@/lib/queries";
import { slotEventsLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Programi i termini: djeca i odrasli",
  description:
    "Sportski programi za djecu i odrasle u Brckovljanima i Sesvetskom Kraljevcu. Dob, termini i slobodna mjesta uživo, online prijava u minutu.",
  alternates: { canonical: "/aktivnosti" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ActivitiesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [allActivities, locations, allSlots] = await Promise.all([getActivities(), getLocations(), getSlots()]);
  const f = applyFilters(allActivities, allSlots, locations, one(sp.za), one(sp.lokacija));
  return (
    <>
      <PageHero
        title="Programi i termini"
        intro="Odaberite program i termin, a prijavu pošaljite u minutu. Uz svaki termin vidi se koliko je još slobodnih mjesta."
        crumbs={[{ name: "Programi i termini", path: "/aktivnosti" }]}
      />
      <section id="programi" aria-label="Programi" className="container scroll-mt-24 py-12 sm:py-16">
        <ScheduleFilters base="/aktivnosti" audience={f.audience} location={f.location} locations={locations} />
        <ActivitySchedule activities={f.activities} slots={f.slots} locations={locations} />
      </section>
      <Benefits />
      <JsonLd data={slotEventsLd(allSlots, allActivities, locations)} />
    </>
  );
}
