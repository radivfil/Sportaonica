import Link from "next/link";
import { repo } from "@/lib/data";
import type { RegistrationStatus } from "@/lib/data/types";
import { lookups } from "@/lib/admin-data";
import { ageOn } from "@/lib/age";
import { formatDateTime } from "@/lib/format";
import { Flash, PageTitle, STATUS_CLASS, STATUS_LABEL } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { cancelRegistrationAdmin, promoteRegistration, togglePaid } from "../../actions";

export const metadata = { title: "Prijave" };

type SP = Promise<Record<string, string | undefined>>;

export default async function RegistrationsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filter = {
    activityId: sp.aktivnost || undefined,
    locationId: sp.lokacija || undefined,
    slotId: sp.termin || undefined,
    status: (sp.status as RegistrationStatus) || undefined,
    q: sp.q || undefined,
  };
  const [{ activities, locations, slots, slotLabel, slotMap }, regs] = await Promise.all([lookups(), repo().listRegistrations(filter)]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && !["ok", "error"].includes(k)) as [string, string][]).toString();
  const returnTo = `/admin/prijave${qs ? `?${qs}` : ""}`;

  return (
    <>
      <PageTitle title="Prijave" intro={`${regs.length} ${regs.length === 1 ? "prijava" : "prijava"} prema odabranim filtrima`}>
        <Link href="/admin/prijave/nova" className="btn-primary">+ Dodaj ručno</Link>
        <a href={`/api/admin/export?format=excel${qs ? `&${qs}` : ""}`} className="btn-secondary">⬇️ Excel</a>
        <a href={`/api/admin/export?format=csv${qs ? `&${qs}` : ""}`} className="btn-secondary">⬇️ CSV</a>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />

      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="field-label">Pretraga</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Ime, e-mail, telefon…" className="field" />
        </div>
        <div>
          <label htmlFor="aktivnost" className="field-label">Aktivnost</label>
          <select id="aktivnost" name="aktivnost" defaultValue={sp.aktivnost ?? ""} className="field">
            <option value="">Sve</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lokacija" className="field-label">Lokacija</label>
          <select id="lokacija" name="lokacija" defaultValue={sp.lokacija ?? ""} className="field">
            <option value="">Sve</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="termin" className="field-label">Termin</label>
          <select id="termin" name="termin" defaultValue={sp.termin ?? ""} className="field">
            <option value="">Svi</option>
            {slots.map((s) => <option key={s.id} value={s.id}>{slotLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="field-label">Status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="field">
            <option value="">Svi</option>
            <option value="confirmed">Upisani</option>
            <option value="waitlist">Lista čekanja</option>
            <option value="cancelled">Otkazani</option>
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn-navy">Filtriraj</button>
          {qs && <Link href="/admin/prijave" className="btn-ghost">Očisti filtre</Link>}
          {filter.slotId && (
            <Link href={`/admin/termini/${filter.slotId}/prisutnost`} className="btn-secondary ml-auto">🖨️ Popis prisutnosti</Link>
          )}
        </div>
      </form>

      {regs.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">Nema prijava za odabrane filtre.</p>
      ) : (
        <ul className="grid gap-3">
          {regs.map((r) => {
            const slot = slotMap.get(r.slotId);
            return (
              <li key={r.id} className={`card p-4 sm:p-5 ${r.status === "cancelled" ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/prijave/${r.id}`} className="text-xl font-extrabold text-ink hover:underline">{r.childName}</Link>
                      <span className="text-sm font-bold text-ink-soft">{ageOn(r.childBirthDate)} god.</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.paid && <span className="rounded-full bg-teal-500 px-2.5 py-0.5 text-xs font-bold text-white">Plaćeno</span>}
                      {r.healthNote && <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-bold text-coral-700" title={r.healthNote}>⚕️ Napomena</span>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">{slotLabel(slot)}</p>
                    <p className="mt-1 text-sm text-ink">
                      {r.parentName} · <a href={`tel:${r.phone}`} className="font-bold text-navy underline">{r.phone}</a> ·{" "}
                      <a href={`mailto:${r.email}`} className="break-all text-navy underline">{r.email}</a>
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">Prijavljeno: {formatDateTime(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "cancelled" && (
                      <form action={togglePaid}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <SubmitButton className={`btn !min-h-[44px] !px-4 ${r.paid ? "bg-teal-100 text-teal-700" : "bg-white text-ink ring-1 ring-ink/15"}`} pendingLabel="…">
                          {r.paid ? "✓ Plaćeno" : "Označi plaćeno"}
                        </SubmitButton>
                      </form>
                    )}
                    {r.status === "waitlist" && slot && !slot.isFull && (
                      <form action={promoteRegistration}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <SubmitButton className="btn-navy !min-h-[44px] !px-4">Upiši u termin</SubmitButton>
                      </form>
                    )}
                    <Link href={`/admin/prijave/${r.id}`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Uredi</Link>
                    {r.status !== "cancelled" && (
                      <form action={cancelRegistrationAdmin}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <ConfirmButton message={`Otkazati prijavu za ${r.childName}?`} className="btn !min-h-[44px] bg-coral-100 !px-4 text-coral-700">
                          Otkaži
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
