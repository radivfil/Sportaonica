import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { formatBirthDate, formatDateTime } from "@/lib/format";
import { ageOn } from "@/lib/age";
import { Checkbox, Flash, PageTitle, Select, STATUS_CLASS, STATUS_LABEL } from "@/components/admin/Fields";
import { RegistrationFields } from "@/components/admin/RegistrationFields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { cancelRegistrationAdmin, deleteRegistration, moveRegistration, updateRegistration } from "../../../actions";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Prijava" };

export default async function RegistrationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [reg, { slots, slotLabel, slotMap }] = await Promise.all([repo().getRegistration(id), lookups()]);
  if (!reg) notFound();
  const slot = slotMap.get(reg.slotId);

  return (
    <>
      <PageTitle title={reg.childName} intro={`${ageOn(reg.childBirthDate)} god. (rođ. ${formatBirthDate(reg.childBirthDate)}) · ${slotLabel(slot)}`}>
        <Link href="/admin/prijave" className="btn-ghost">← Sve prijave</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-bold ${STATUS_CLASS[reg.status]}`}>{STATUS_LABEL[reg.status]}</span>
        <span className="text-ink-soft">Prijavljeno {formatDateTime(reg.createdAt)} · izmijenjeno {formatDateTime(reg.updatedAt)}</span>
        <span className="text-ink-soft">· GDPR privola: {reg.gdprConsent ? "da" : "ne"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <form action={updateRegistration} className="card grid gap-6 p-5 sm:p-8">
          <input type="hidden" name="id" value={reg.id} />
          <RegistrationFields reg={reg} />
          <SubmitButton className="btn-navy justify-self-start">Spremi promjene</SubmitButton>
        </form>

        <div className="grid content-start gap-6">
          <form action={moveRegistration} className="card grid gap-4 p-5">
            <h2 className="text-xl font-extrabold">Premjesti u drugi termin</h2>
            <input type="hidden" name="id" value={reg.id} />
            <Select label="Novi termin" name="targetSlotId" defaultValue={reg.slotId}>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {slotLabel(s)} — {s.isFull ? "PUN" : `${s.remaining} slob.`}
                </option>
              ))}
            </Select>
            <Checkbox label="Upiši iznad kapaciteta" name="force" />
            <SubmitButton className="btn-secondary">Premjesti</SubmitButton>
          </form>

          {reg.status !== "cancelled" && (
            <form action={cancelRegistrationAdmin} className="card grid gap-3 p-5">
              <h2 className="text-xl font-extrabold">Otkaži prijavu</h2>
              <p className="text-sm text-ink-soft">Mjesto se oslobađa, a prvo dijete s liste čekanja automatski se upisuje (uz e-mail).</p>
              <input type="hidden" name="id" value={reg.id} />
              <input type="hidden" name="returnTo" value={`/admin/prijave/${reg.id}`} />
              <ConfirmButton message="Sigurno otkazati ovu prijavu?">Otkaži prijavu</ConfirmButton>
            </form>
          )}

          <form action={deleteRegistration} className="card grid gap-3 border-2 border-dashed border-coral/40 p-5">
            <h2 className="text-xl font-extrabold">Trajno obriši podatke (GDPR)</h2>
            <p className="text-sm text-ink-soft">Na zahtjev roditelja. Brisanje je nepovratno.</p>
            <input type="hidden" name="id" value={reg.id} />
            <ConfirmButton message="Trajno obrisati sve podatke ove prijave? Ovo se ne može poništiti." className="btn bg-coral text-white hover:bg-coral-700">
              Obriši zauvijek
            </ConfirmButton>
          </form>

          <p className="break-all text-xs text-ink-faint">
            Poveznica roditelja za otkazivanje: {SITE_URL}/otkazivanje/{reg.cancelToken}
          </p>
        </div>
      </div>
    </>
  );
}
