import { repo } from "@/lib/data";
import { Flash, PageTitle, TextArea, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { saveFaq, saveLocation, savePricing, saveTrainer } from "../../actions";

export const metadata = { title: "Sadržaj stranice" };

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [content, locations] = await Promise.all([repo().getContent(), repo().listLocations()]);
  return (
    <>
      <PageTitle title="Sadržaj stranice" intro="Uredite tekstove bez programera. Promjene su odmah vidljive na webu." />
      <Flash ok={sp.ok} error={sp.error} />
      <nav aria-label="Odjeljci" className="mb-6 flex flex-wrap gap-2 text-sm font-bold">
        {[["#faq", "Česta pitanja"], ["#trener", "O treneru"], ["#lokacije", "Lokacije"], ["#clanarina", "Članarina"]].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full bg-white px-4 py-2 text-navy ring-1 ring-ink/10">{l}</a>
        ))}
      </nav>

      <div className="grid gap-8">
        <section id="faq" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="faq-h">
          <h2 id="faq-h" className="mb-4 text-2xl font-extrabold">Česta pitanja</h2>
          <form action={saveFaq} className="grid gap-4">
            <FaqEditor initial={content.faq} />
            <SubmitButton className="btn-primary justify-self-start">Spremi pitanja</SubmitButton>
          </form>
        </section>

        <section id="trener" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="tr-h">
          <h2 id="tr-h" className="mb-4 text-2xl font-extrabold">O treneru</h2>
          <form action={saveTrainer} className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="grid gap-4">
              <TextField label="Ime i prezime" name="name" defaultValue={content.trainer.name} />
              <TextField label="Titula / uloga" name="title" defaultValue={content.trainer.title} />
              <TextArea label="Biografija" name="bio" rows={7} defaultValue={content.trainer.bio} hint="Odlomke odvojite praznim redom." />
              <TextArea label="Istaknuto (jedna stavka po retku)" name="highlights" rows={4} defaultValue={content.trainer.highlights.join("\n")} />
            </div>
            <div className="grid content-start gap-3">
              <span className="field-label">Fotografija trenera</span>
              <ImageUpload name="photo" initial={content.trainer.photo} />
            </div>
            <SubmitButton className="btn-primary justify-self-start">Spremi</SubmitButton>
          </form>
        </section>

        <section id="lokacije" className="scroll-mt-24" aria-labelledby="loc-h">
          <h2 id="loc-h" className="mb-4 text-2xl font-extrabold">Lokacije</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {locations.map((l) => (
              <form key={l.id} id={l.slug} action={saveLocation} className="card grid scroll-mt-24 content-start gap-3 p-5">
                <input type="hidden" name="id" value={l.id} />
                <TextField label="Naziv" name="name" defaultValue={l.name} />
                <TextField label="Dvorana" name="venue" defaultValue={l.venue} />
                <TextField label="Ulica i broj" name="address" defaultValue={l.address} />
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <TextField label="Poštanski br." name="postalCode" defaultValue={l.postalCode} />
                  <TextField label="Mjesto" name="city" defaultValue={l.city} />
                </div>
                <TextArea label="Opis (parking, ulaz…)" name="description" rows={3} defaultValue={l.description} />
                <TextField label="Poveznica na kartu" name="mapUrl" defaultValue={l.mapUrl} />
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Geo. širina" name="lat" defaultValue={String(l.lat)} inputMode="decimal" />
                  <TextField label="Geo. dužina" name="lng" defaultValue={String(l.lng)} inputMode="decimal" />
                </div>
                <SubmitButton className="btn-navy">Spremi {l.name}</SubmitButton>
              </form>
            ))}
          </div>
        </section>

        <section id="clanarina" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="cl-h">
          <h2 id="cl-h" className="mb-4 text-2xl font-extrabold">Članarina (tekst na stranici Upisi)</h2>
          <form action={savePricing} className="grid gap-4">
            <TextArea label="Tekst" name="pricingNote" rows={3} defaultValue={content.pricingNote} />
            <SubmitButton className="btn-primary justify-self-start">Spremi</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
