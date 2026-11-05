import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { slotWhen } from "@/lib/format";
import { FillBar } from "@/components/booking/FillBar";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { deleteSlot, duplicateSlot } from "../../actions";

export const metadata = { title: "Termini" };

export default async function SlotsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; prosli?: string }> }) {
  const sp = await searchParams;
  const { slots, actMap, locations } = await lookups(await adminRepo());
  const showPast = sp.prosli === "1";
  const visible = slots.filter((s) => showPast || !s.isPast);
  return (
    <>
      <PageTitle title="Termini" intro="Tjedne grupe (upis za cijelu sezonu) i pojedinačni termini (radionice, serije).">
        <Link href="/admin/termini/generator" className="btn-primary">+ Generiraj termine</Link>
        <Link href="/admin/termini/novi" className="btn-secondary">+ Jedan termin</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <p className="mb-6">
        <Link href={showPast ? "/admin/termini" : "/admin/termini?prosli=1"} className="font-bold text-navy underline">
          {showPast ? "Sakrij prošle termine" : "Prikaži i prošle termine"}
        </Link>
      </p>
      <div className="grid gap-8">
        {locations.map((loc) => {
          const own = visible.filter((s) => s.locationId === loc.id);
          return (
            <section key={loc.id} aria-labelledby={`l-${loc.id}`}>
              <h2 id={`l-${loc.id}`} className="mb-3 text-2xl font-extrabold">📍 {loc.name}</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {own.map((s) => (
                  <li key={s.id} className={`card min-w-0 p-5 ${s.status === "archived" || s.isPast ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-lg font-extrabold">{actMap.get(s.activityId)?.name}</p>
                        <p className="font-semibold text-ink-soft">{slotWhen(s)}</p>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
                          <span className="rounded-full bg-sky-100 px-2 py-0.5">{s.kind === "weekly" ? "Tjedna grupa" : s.seriesId ? "Dio serije" : "Pojedinačni"}</span>
                          {s.status === "archived" && <span className="rounded-full bg-ink/10 px-2 py-0.5">Arhivirano</span>}
                          {s.isPast && <span className="rounded-full bg-ink/10 px-2 py-0.5">Prošlo</span>}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-bold">
                        {s.activeCount}/{s.capacity}
                        {s.waitlistCount > 0 && <span className="block text-ink-soft">+{s.waitlistCount} čeka</span>}
                      </span>
                    </div>
                    <FillBar taken={s.activeCount} capacity={s.capacity} className="mt-3" />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/admin/termini/${s.id}`} className="btn-navy !min-h-[44px] !px-4">Uredi</Link>
                      <Link href={`/admin/prijave?termin=${s.id}`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Prijave</Link>
                      <Link href={`/admin/termini/${s.id}/prisutnost`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">🖨️ Prisutni</Link>
                      <form action={duplicateSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Dupliciraj</SubmitButton>
                      </form>
                      {s.activeCount + s.waitlistCount === 0 && (
                        <form action={deleteSlot}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton message="Obrisati termin? (Moguće samo ako nikad nije imao prijava.)" className="btn !min-h-[44px] bg-coral-100 !px-4 text-coral-700">
                            Obriši
                          </ConfirmButton>
                        </form>
                      )}
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
