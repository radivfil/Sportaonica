import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { ScheduleTeaser } from "@/components/home/ScheduleTeaser";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActivities, getContent, getLocations, getSlots } from "@/lib/queries";
import { slotEventsLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Termini i upisi — online prijava djeteta",
  description: "Pogledajte slobodna mjesta i prijavite dijete online u nekoliko koraka. Lista čekanja za popunjene termine. Božjakovina, Brckovljani, Sesvetski Kraljevec.",
  alternates: { canonical: "/upisi" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const [activities, locations, slots, content] = await Promise.all([getActivities(), getLocations(), getSlots(), getContent()]);
  const activeIds = new Set(activities.map((a) => a.id));
  const publicSlots = slots.filter((s) => activeIds.has(s.activityId));

  return (
    <>
      <PageHero
        title="Termini i upisi"
        intro="Prijava traje dvije minute: odaberite aktivnost, lokaciju i termin te ispunite kratki obrazac. Potvrdu dobivate odmah na e-mail."
        crumbs={[{ name: "Termini i upisi", path: "/upisi" }]}
      >
        <ul className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
          {["Slobodna mjesta uživo", "Lista čekanja za pune termine", "Bez online plaćanja"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-ink ring-1 ring-ink/10">
              <Icon name="check" className="h-4 w-4 text-teal-700" /> {t}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start [&>*]:min-w-0">
        <BookingWizard
          activities={activities}
          locations={locations}
          slots={publicSlots}
          initial={{ activity: str(sp.aktivnost), location: str(sp.lokacija), slot: str(sp.termin) }}
        />
        <aside className="grid gap-4 lg:sticky lg:top-28" aria-label="Korisne informacije">
          <div className="rounded-4xl bg-butter-100 p-6">
            <h2 className="text-xl font-extrabold">Članarina</h2>
            <p className="mt-2 leading-relaxed text-ink">{content.pricingNote}</p>
          </div>
          <div className="rounded-4xl bg-teal-100 p-6">
            <h2 className="text-xl font-extrabold">Kako to radi?</h2>
            <ol className="mt-3 grid gap-2 font-semibold text-ink">
              {["Odaberete termin sa slobodnim mjestom", "Dobijete potvrdu e-mailom", "Dođete na prvi trening!"].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-display font-extrabold text-navy">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <section id="raspored" aria-labelledby="raspored-title" className="scroll-mt-24 bg-white py-16">
        <div className="container">
          <SectionHeading id="raspored-title" eyebrow="Raspored" title="Svi termini" intro="Kliknite na termin za izravnu prijavu." />
          <ScheduleTeaser slots={publicSlots} activities={activities} locations={locations} />
        </div>
      </section>
      <JsonLd data={slotEventsLd(publicSlots, activities, locations)} />
    </>
  );
}
