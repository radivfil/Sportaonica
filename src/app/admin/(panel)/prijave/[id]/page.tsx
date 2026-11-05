import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRepo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { formatBirthDate, formatDateTime, telHref } from "@/lib/format";
import { ageYears } from "@/lib/data/rules";
import { Checkbox, Flash, PageTitle, Select, STATUS_CLASS, STATUS_LABEL } from "@/components/admin/Fields";
import { RegistrationFields } from "@/components/admin/RegistrationFields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { anonymizeRegistration, cancelRegistrationAdmin, moveRegistration, promoteRegistration, updateRegistration } from "../../../actions";

export const metadata = { title: "Prijava" };

export default async function RegistrationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const repo = await adminRepo();
  const [reg, { slots, slotLabel, slotMap }] = await Promise.all([repo.getRegistration(id), lookups(repo)]);
  if (!reg) notFound();
  const slot = slotMap.get(reg.slotId);
  const open = reg.status === "active" || reg.status === "waitlist";

  if (reg.anonymizedAt) {
    return (
      <>
        <PageTitle title="Obrisani podaci" intro={`${slotLabel(slot)} · anonimizirano ${formatDateTime(reg.anonymizedAt)}`}>
          <Link href="/admin/prijave" className="btn-ghost">← Sve prijave</Link>
        </PageTitle>
        <p className="card p-6 text-ink-soft">Osobni podaci ove prijave trajno su obrisani (GDPR). Zapis ostaje samo radi statistike.</p>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={reg.childName}
        intro={`${reg.childBirthDate ? `${ageYears(reg.childBirthDate)} god. (rođ. ${formatBirthDate(reg.childBirthDate)}) · ` : ""}${slotLabel(slot)}`}
      >
        <a href={telHref(reg.phone)} className="btn-navy">📞 Nazovi</a>
        <a href={`mailto:${reg.email}`} className="btn-secondary">✉️ Pošalji e-mail</a>
        <Link href="/admin/prijave" className="btn-ghost">← Sve prijave</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-bold ${STATUS_CLASS[reg.status]}`}>{STATUS_LABEL[reg.status]}</span>
        <span className="text-ink-soft">
          Prijavljeno {formatDateTime(reg.createdAt)} · izmijenjeno {formatDateTime(reg.updatedAt)}
          {reg.cancelledAt && ` · otkazano ${formatDateTime(reg.cancelledAt)}`}
          {reg.promotedAt && ` · s liste čekanja ${formatDateTime(reg.promotedAt)}`}
        </span>
        <span className="text-ink-soft">· GDPR privola: {reg.gdprConsent ? "da" : "ne"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <form action={updateRegistration} className="card grid gap-6 p-5 sm:p-8">
          <input type="hidden" name="id" value={reg.id} />
          <RegistrationFields reg={reg} />
          <SubmitButton className="btn-navy justify-self-start">Spremi promjene</SubmitButton>
        </form>

        <div className="grid content-start gap-6">
          {reg.status === "waitlist" && (
            <form action={promoteRegistration} className="card grid gap-3 p-5">
              <h2 className="text-xl font-extrabold">Upiši s liste čekanja</h2>
              <input type="hidden" name="id" value={reg.id} />
              <input type="hidden" name="returnTo" value={`/admin/prijave/${reg.id}`} />
              <Checkbox label="Upiši iznad kapaciteta" name="force" />
              <SubmitButton className="btn-navy">Upiši (roditelj dobiva e-mail)</SubmitButton>
            </form>
          )}

          {open && (
            <form action={moveRegistration} className="card grid gap-4 p-5">
              <h2 className="text-xl font-extrabold">Premjesti u drugi termin</h2>
              <input type="hidden" name="id" value={reg.id} />
              <Select label="Novi termin" name="targetSlotId" defaultValue={reg.slotId}>
                {slots
                  .filter((s) => s.status === "active" && !s.isPast)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {slotLabel(s)}: {s.isFull ? "PUN" : `${s.remaining} slob.`}
                    </option>
                  ))}
              </Select>
              <Checkbox label="Upiši iznad kapaciteta" name="force" />
              <SubmitButton className="btn-secondary">Premjesti</SubmitButton>
            </form>
          )}

          {open && (
            <form action={cancelRegistrationAdmin} className="card grid gap-3 p-5">
              <h2 className="text-xl font-extrabold">Otkaži prijavu</h2>
              <p className="text-sm text-ink-soft">Mjesto se oslobađa, a prvi s liste čekanja automatski se upisuje (uz e-mail). Povijest ostaje sačuvana.</p>
              <input type="hidden" name="id" value={reg.id} />
              <input type="hidden" name="returnTo" value={`/admin/prijave/${reg.id}`} />
              <ConfirmButton message="Sigurno otkazati ovu prijavu?">Otkaži prijavu</ConfirmButton>
            </form>
          )}

          <section className="card grid gap-3 border-2 border-dashed border-coral/40 p-5" aria-labelledby="gdpr-t">
            <h2 id="gdpr-t" className="text-xl font-extrabold">Zahtjev roditelja (GDPR)</h2>
            <a href={`/api/admin/child-export?id=${reg.id}`} className="btn-secondary">⬇️ Izvezi sve podatke o polazniku (JSON)</a>
            <form action={anonymizeRegistration} className="grid gap-2">
              <p className="text-sm text-ink-soft">Trajno briše ime, kontakt, datum rođenja i napomene. Zapis o prijavi ostaje bez osobnih podataka. Nepovratno.</p>
              <input type="hidden" name="id" value={reg.id} />
              <ConfirmButton message="Trajno obrisati osobne podatke ove prijave? Ovo se ne može poništiti." className="btn bg-coral text-white hover:bg-coral-700">
                Trajno obriši osobne podatke
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
