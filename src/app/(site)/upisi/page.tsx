import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { BookingForm } from "@/components/booking/BookingForm";
import { ActivitySchedule, ScheduleFilters, applyFilters } from "@/components/schedule/ActivitySchedule";
import { Icon } from "@/components/ui/Icon";
import { getActivities, getContent, getLocations, getSlots } from "@/lib/queries";
import { remainingSeries } from "@/lib/data/rules";
import { Suspense } from "react";
import { StaticBooking } from "@/components/booking/StaticBooking";
import { STATIC_DEMO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Upisi: online prijava",
  description: "Prijavite dijete ili sebe online u minutu, bez korisničkog računa. Slobodna mjesta uživo, lista čekanja za popunjene termine. Brckovljani i Sesvetski Kraljevec.",
  alternates: { canonical: "/upisi" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BookingPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [activities, locations, slots, content] = await Promise.all([getActivities(), getLocations(), getSlots(), getContent()]);
  const slot = slots.find((s) => s.id === one(sp.termin));
  const activity = slot && activities.find((a) => a.id === slot.activityId);
  const location = slot && locations.find((l) => l.id === slot.locationId);

  const aside = (
    <aside className="grid gap-4 lg:sticky lg:top-28" aria-label="Korisne informacije">
      <div className="rounded-4xl bg-butter-100 p-6">
        <h2 className="text-xl font-extrabold">Članarina</h2>
        <p className="mt-2 leading-relaxed text-ink">{content.pricingNote}</p>
      </div>
      <div className="rounded-4xl bg-teal-100 p-6">
        <h2 className="text-xl font-extrabold">Kako to radi?</h2>
        <ol className="mt-3 grid gap-2 font-semibold text-ink">
          {["Odaberete termin sa slobodnim mjestom", "Odmah dobijete potvrdu e-mailom", "U e-mailu je poveznica za otkazivanje"].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-display font-extrabold text-navy">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );

  if (slot && activity && location) {
    const series = slot.seriesId ? remainingSeries(slots, slot.seriesId) : [];
    return (
      <>
        <PageHero title="Prijava" intro="Ispunite kratki obrazac. Potvrdu dobivate odmah na e-mail." crumbs={[{ name: "Upisi", path: "/upisi" }]} />
        <div className="container grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start [&>*]:min-w-0">
          <BookingForm
            activity={activity}
            location={location}
            slot={slot}
            series={series}
            initialSeries={one(sp.serija) === "1"}
            initialWaitlist={one(sp.cekanje) === "1" || slot.isFull}
          />
          {aside}
        </div>
      </>
    );
  }

  const f = applyFilters(activities, slots, locations, one(sp.za), one(sp.lokacija));
  const timetable = (
    <>
      <PageHero
        title="Upisi"
        intro="Odaberite termin i kliknite „Prijavi”. Prijava traje minutu i ne treba korisnički račun."
        crumbs={[{ name: "Upisi", path: "/upisi" }]}
      >
        <ul className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
          {["Slobodna mjesta uživo", "Lista čekanja za pune termine", "Bez online plaćanja"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-ink ring-1 ring-ink/10">
              <Icon name="check" className="h-4 w-4 text-teal-700" /> {t}
            </li>
          ))}
        </ul>
      </PageHero>
      {one(sp.termin) && (
        <p role="alert" className="container mt-8 rounded-2xl bg-butter-100 p-4 font-semibold">
          Odabrani termin više nije dostupan. Odaberite drugi termin ispod ili nas <Link href="/kontakt" className="underline">kontaktirajte</Link>.
        </p>
      )}
      <section id="programi" aria-label="Termini" className="container scroll-mt-24 py-12">
        <ScheduleFilters base="/upisi" audience={f.audience} location={f.location} locations={locations} />
        <ActivitySchedule activities={f.activities} slots={f.slots} locations={locations} />
      </section>
    </>
  );
  if (!STATIC_DEMO) return timetable;
  return (
    <Suspense fallback={timetable}>
      <StaticBooking
        activities={activities}
        locations={locations}
        slots={slots}
        aside={aside}
        hero={<PageHero title="Prijava" intro="Ispunite kratki obrazac. Potvrdu dobivate odmah na e-mail." crumbs={[{ name: "Upisi", path: "/upisi" }]} />}
      >
        {timetable}
      </StaticBooking>
    </Suspense>
  );
}
