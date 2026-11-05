import { adminRepo } from "@/lib/data";
import { Checkbox, Flash, PageTitle, TextArea, TextField } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { runRetention, saveLocation, saveSettings } from "../../actions";

export const metadata = { title: "Postavke" };

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const repo = await adminRepo();
  const [s, locations] = await Promise.all([repo.getSettings(), repo.listLocations()]);
  return (
    <>
      <PageTitle title="Postavke" />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveSettings} className="grid max-w-3xl gap-6">
        <section className="card grid gap-4 p-5 sm:p-8">
          <h2 className="text-2xl font-extrabold">Obavijest na vrhu stranice (banner)</h2>
          <Checkbox label="Prikaži obavijest" name="bannerEnabled" defaultChecked={s.bannerEnabled} />
          <TextField label="Tekst obavijesti" name="bannerText" defaultValue={s.bannerText} maxLength={160} hint="Npr. „Upisi su u tijeku!”" />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:col-span-2">Kontakt i društvene mreže</h2>
          <TextField label="Telefon" name="phone" defaultValue={s.phone} required />
          <TextField label="E-mail" name="email" type="email" defaultValue={s.email} required />
          <TextField label="Instagram (poveznica)" name="instagramUrl" type="url" defaultValue={s.instagramUrl} placeholder="https://www.instagram.com/…" />
          <TextField label="Facebook (poveznica)" name="facebookUrl" type="url" defaultValue={s.facebookUrl} placeholder="https://www.facebook.com/…" />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:col-span-2">Pravila prijava i zaštita podataka</h2>
          <TextField
            label="Rok za otkazivanje (sati prije termina)"
            name="cancelDeadlineHours"
            type="number"
            min={0}
            max={168}
            defaultValue={s.cancelDeadlineHours}
            hint="Vrijedi za pojedinačne termine. Tjedne grupe roditelj može otkazati bilo kada."
          />
          <TextField
            label="Automatsko brisanje osobnih podataka nakon (mjeseci)"
            name="retentionMonths"
            type="number"
            min={1}
            max={120}
            defaultValue={s.retentionMonths}
            hint="Računa se od završetka termina ili otkazivanja. Provjeriti s pravnim savjetnikom."
          />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:col-span-2">Podaci obrta (podnožje i politika privatnosti)</h2>
          <TextField label="Naziv obrta" name="businessName" defaultValue={s.business.name} className="sm:col-span-2" />
          <TextField label="Vlasnica" name="businessOwner" defaultValue={s.business.owner} />
          <TextField label="OIB" name="oib" defaultValue={s.business.oib} inputMode="numeric" maxLength={11} />
          <TextField label="Adresa sjedišta" name="businessAddress" defaultValue={s.business.address} className="sm:col-span-2" />
        </section>
        <SubmitButton className="btn-primary justify-self-start">Spremi postavke</SubmitButton>
      </form>

      <section id="lokacije" className="mt-10 scroll-mt-24" aria-labelledby="loc-h">
        <h2 id="loc-h" className="mb-4 text-2xl font-extrabold">Lokacije i radno vrijeme</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {locations.map((l) => (
            <form key={l.id} id={l.slug} action={saveLocation} className="card grid scroll-mt-24 content-start gap-3 p-5">
              <input type="hidden" name="id" value={l.id} />
              <TextField label="Naziv" name="name" defaultValue={l.name} />
              <TextField label="Objekt / dvorana" name="venue" defaultValue={l.venue} />
              <TextField label="Ulica i broj" name="address" defaultValue={l.address} />
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <TextField label="Pošt. broj" name="postalCode" defaultValue={l.postalCode} />
                <TextField label="Mjesto" name="city" defaultValue={l.city} />
              </div>
              <TextArea label="Radno vrijeme (jedan red po danu/skupini dana)" name="hours" rows={3} defaultValue={l.hours} hint="Npr. „Pon–Pet: 16:00–20:30”" />
              <TextArea label="Opis (parking, ulaz…)" name="description" rows={3} defaultValue={l.description} />
              <TextField label="Poveznica na kartu (https://…)" name="mapUrl" defaultValue={l.mapUrl} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Geo. širina" name="lat" defaultValue={String(l.lat)} inputMode="decimal" />
                <TextField label="Geo. dužina" name="lng" defaultValue={String(l.lng)} inputMode="decimal" />
              </div>
              <SubmitButton className="btn-navy">Spremi: {l.name}</SubmitButton>
            </form>
          ))}
        </div>
      </section>

      <section className="card mt-10 grid max-w-3xl gap-3 p-5 sm:p-8" aria-labelledby="ret-h">
        <h2 id="ret-h" className="text-2xl font-extrabold">Automatsko brisanje (GDPR)</h2>
        <p className="text-ink-soft">
          Pokreće se samo jednom dnevno. Ovdje ga možete pokrenuti odmah: anonimiziraju se prijave starije od {s.retentionMonths} mjeseci (od završetka ili otkazivanja).
        </p>
        <form action={runRetention}>
          <ConfirmButton message="Pokrenuti brisanje starih osobnih podataka sada? Nepovratno." className="btn-secondary">
            Pokreni brisanje sada
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
