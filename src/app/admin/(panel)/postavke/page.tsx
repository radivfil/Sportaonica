import { repo } from "@/lib/data";
import { Checkbox, Flash, PageTitle, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { saveSettings } from "../../actions";

export const metadata = { title: "Postavke" };

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await repo().getSettings();
  return (
    <>
      <PageTitle title="Postavke stranice" />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveSettings} className="grid max-w-3xl gap-6">
        <section className="card grid gap-4 p-5 sm:p-8">
          <h2 className="text-2xl font-extrabold">Obavijest na vrhu stranice</h2>
          <Checkbox label="Prikaži obavijest" name="bannerEnabled" defaultChecked={s.bannerEnabled} />
          <TextField label="Tekst obavijesti" name="bannerText" defaultValue={s.bannerText} maxLength={120} hint="Npr. „Upisi su u tijeku!”" />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:col-span-2">Kontakt i društvene mreže</h2>
          <TextField label="Telefon" name="phone" defaultValue={s.phone} required />
          <TextField label="E-mail" name="email" type="email" defaultValue={s.email} required />
          <TextField label="Instagram (poveznica)" name="instagramUrl" type="url" defaultValue={s.instagramUrl} />
          <TextField label="Facebook (poveznica)" name="facebookUrl" type="url" defaultValue={s.facebookUrl} />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:col-span-2">Podaci obrta (podnožje)</h2>
          <TextField label="Naziv obrta" name="businessName" defaultValue={s.business.name} className="sm:col-span-2" />
          <TextField label="Vlasnik" name="businessOwner" defaultValue={s.business.owner} />
          <TextField label="OIB" name="oib" defaultValue={s.business.oib} inputMode="numeric" maxLength={11} />
          <TextField label="Adresa" name="businessAddress" defaultValue={s.business.address} className="sm:col-span-2" />
        </section>
        <SubmitButton className="btn-primary justify-self-start">Spremi postavke</SubmitButton>
      </form>
    </>
  );
}
