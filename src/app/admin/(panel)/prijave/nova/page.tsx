import Link from "next/link";
import { lookups } from "@/lib/admin-data";
import { Checkbox, Flash, PageTitle, Select } from "@/components/admin/Fields";
import { RegistrationFields } from "@/components/admin/RegistrationFields";
import { SubmitButton } from "@/components/admin/ui";
import { createRegistration } from "../../../actions";

export const metadata = { title: "Nova prijava" };

export default async function NewRegistration({ searchParams }: { searchParams: Promise<{ error?: string; termin?: string }> }) {
  const sp = await searchParams;
  const { slots, slotLabel } = await lookups();
  return (
    <>
      <PageTitle title="Dodaj prijavu ručno" intro="Npr. za prijave primljene telefonom ili uživo.">
        <Link href="/admin/prijave" className="btn-ghost">← Natrag</Link>
      </PageTitle>
      <Flash error={sp.error} />
      <form action={createRegistration} className="card grid gap-6 p-5 sm:p-8">
        <Select label="Termin" name="slotId" defaultValue={sp.termin ?? ""} required>
          <option value="">— odaberite termin —</option>
          {slots.filter((s) => s.status === "active").map((s) => (
            <option key={s.id} value={s.id}>
              {slotLabel(s)} — {s.isFull ? "PUN" : `${s.remaining} slob.`}
            </option>
          ))}
        </Select>
        <RegistrationFields />
        <div className="grid gap-3 sm:grid-cols-3">
          <Checkbox label="Lista čekanja ako je pun" name="waitlist" defaultChecked />
          <Checkbox label="Upiši iznad kapaciteta" name="force" hint="Samo iznimno." />
          <Checkbox label="Zanemari dob" name="ignoreAge" />
        </div>
        <p className="text-sm text-ink-soft">Ručnim unosom potvrđujete da je roditelj dao privolu za obradu podataka. Potvrdni e-mail se ne šalje automatski.</p>
        <SubmitButton className="btn-primary justify-self-start">Spremi prijavu</SubmitButton>
      </form>
    </>
  );
}
