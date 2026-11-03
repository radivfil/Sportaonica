import type { Registration } from "@/lib/data/types";
import { SOURCES } from "@/lib/validation";
import { Checkbox, Select, TextArea, TextField } from "./Fields";

export function RegistrationFields({ reg }: { reg?: Registration }) {
  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-extrabold">Roditelj</legend>
        <TextField label="Ime i prezime roditelja" name="parentName" defaultValue={reg?.parentName} required className="sm:col-span-2" />
        <TextField label="Telefon" name="phone" type="tel" defaultValue={reg?.phone} required />
        <TextField label="E-mail" name="email" type="email" defaultValue={reg?.email} required />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-extrabold">Dijete</legend>
        <TextField label="Ime i prezime djeteta" name="childName" defaultValue={reg?.childName} required />
        <TextField label="Datum rođenja" name="childBirthDate" type="date" defaultValue={reg?.childBirthDate} required />
        <TextArea label="Napomena o zdravlju / alergijama" name="healthNote" rows={2} defaultValue={reg?.healthNote} className="sm:col-span-2" />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Kako su čuli za nas" name="source" defaultValue={reg?.source ?? ""}>
          <option value="">—</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <TextField label="Interna napomena (vidi samo vlasnik)" name="adminNote" defaultValue={reg?.adminNote} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox label="Plaćeno" name="paid" defaultChecked={reg?.paid} hint="Samo oznaka — bez online plaćanja." />
        <Checkbox label="Privola za marketing" name="marketingConsent" defaultChecked={reg?.marketingConsent} />
      </div>
    </>
  );
}
