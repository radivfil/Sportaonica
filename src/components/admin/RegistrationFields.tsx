import type { Registration } from "@/lib/data/types";
import { Checkbox, TextArea, TextField } from "./Fields";

/** Only the data the programme needs (data minimisation). */
export function RegistrationFields({ reg }: { reg?: Registration }) {
  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-extrabold">Roditelj / kontakt osoba</legend>
        <TextField label="Ime i prezime" name="parentName" defaultValue={reg?.parentName} required autoComplete="off" className="sm:col-span-2" />
        <TextField label="Telefon" name="phone" type="tel" inputMode="tel" defaultValue={reg?.phone} required />
        <TextField label="E-mail" name="email" type="email" inputMode="email" defaultValue={reg?.email} required />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-extrabold">Polaznik (dijete ili odrasla osoba)</legend>
        <TextField label="Ime i prezime polaznika" name="childName" defaultValue={reg?.childName} required autoComplete="off" />
        <TextField label="Datum rođenja" name="childBirthDate" type="date" defaultValue={reg?.childBirthDate} required />
        <TextArea label="Napomena o zdravlju / alergijama (neobavezno)" name="healthNote" rows={2} maxLength={600} defaultValue={reg?.healthNote} className="sm:col-span-2" />
      </fieldset>
      <TextArea label="Interna bilješka (vidi samo administracija)" name="adminNote" rows={2} maxLength={2000} defaultValue={reg?.adminNote} />
      <Checkbox label="Plaćeno" name="paid" defaultChecked={reg?.paid} hint="Samo oznaka. Online plaćanja nema." />
    </>
  );
}
