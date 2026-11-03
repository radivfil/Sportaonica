import Link from "next/link";
import { lookups } from "@/lib/admin-data";
import { WEEKDAYS } from "@/lib/format";
import { FillBar } from "@/components/booking/FillBar";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { deleteSlot, duplicateSlot } from "../../actions";

export const metadata = { title: "Termini" };

export default async function SlotsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { slots, actMap, locations } = await lookups();
  return (
    <>
      <PageTitle title="Termini" intro="Dan, vrijeme i kapacitet za svaku grupu.">
        <Link href="/admin/termini/novi" className="btn-primary">+ Novi termin</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-8">
        {locations.map((loc) => {
          const own = slots.filter((s) => s.locationId === loc.id);
          return (
            <section key={loc.id} aria-labelledby={`l-${loc.id}`}>
              <h2 id={`l-${loc.id}`} className="mb-3 text-2xl font-extrabold">📍 {loc.name}</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {own.map((s) => (
                  <li key={s.id} className={`card p-5 ${s.status === "archived" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold">{actMap.get(s.activityId)?.name}</p>
                        <p className="font-semibold text-ink-soft">
                          {WEEKDAYS[s.dayOfWeek]} · {s.startTime}–{s.endTime}
                          {s.status === "archived" && " · ARHIVIRANO"}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-bold">
                        {s.taken}/{s.capacity}
                        {s.waitlistCount > 0 && <span className="block text-ink-soft">+{s.waitlistCount} čeka</span>}
                      </span>
                    </div>
                    <FillBar taken={s.taken} capacity={s.capacity} className="mt-3" />
                    <p className="mt-2 text-xs text-ink-soft">
                      Već upisani izvan weba: {s.preEnrolled} · web prijave: {s.confirmedCount}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/admin/termini/${s.id}`} className="btn-navy !min-h-[44px] !px-4">Uredi</Link>
                      <Link href={`/admin/prijave?termin=${s.id}`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Prijave</Link>
                      <Link href={`/admin/termini/${s.id}/prisutnost`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">🖨️ Prisutnost</Link>
                      <form action={duplicateSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Dupliciraj</SubmitButton>
                      </form>
                      <form action={deleteSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message="Obrisati termin? (Moguće samo ako nema aktivnih prijava.)" className="btn !min-h-[44px] bg-coral-100 !px-4 text-coral-700">Obriši</ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
                {own.length === 0 && <li className="text-ink-soft">Nema termina.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
