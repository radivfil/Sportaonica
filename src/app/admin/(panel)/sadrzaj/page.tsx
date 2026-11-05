import { adminRepo } from "@/lib/data";
import { Flash, PageTitle, TextArea, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { PackagesEditor, PeopleEditor } from "@/components/admin/RepeaterEditors";
import { saveAbout, saveBirthdays, saveFaq, savePricing } from "../../actions";

export const metadata = { title: "Sadržaj stranice" };

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const content = await (await adminRepo()).getContent();
  return (
    <>
      <PageTitle title="Sadržaj stranice" intro="Uredite tekstove bez programera. Promjene su odmah vidljive na webu." />
      <Flash ok={sp.ok} error={sp.error} />
      <nav aria-label="Odjeljci" className="mb-6 flex flex-wrap gap-2 text-sm font-bold">
        {[
          ["#o-nama", "O nama"],
          ["#rodendani", "Rođendani"],
          ["#faq", "Česta pitanja"],
          ["#clanarina", "Članarina"],
        ].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full bg-white px-4 py-2 text-navy ring-1 ring-ink/10">{l}</a>
        ))}
      </nav>

      <div className="grid gap-8">
        <section id="o-nama" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="about-h">
          <h2 id="about-h" className="mb-4 text-2xl font-extrabold">O nama</h2>
          <form action={saveAbout} className="grid gap-4">
            <TextField label="Naslov stranice" name="heading" defaultValue={content.about.heading} />
            <TextArea label="Uvodni tekst" name="intro" rows={4} defaultValue={content.about.intro} />
            <h3 className="mt-2 text-lg font-extrabold">Vlasnica i treneri</h3>
            <PeopleEditor initial={content.about.people} />
            <SubmitButton className="btn-primary justify-self-start">Spremi „O nama”</SubmitButton>
          </form>
        </section>

        <section id="rodendani" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="bd-h">
          <h2 id="bd-h" className="mb-4 text-2xl font-extrabold">Dječji rođendani</h2>
          <form action={saveBirthdays} className="grid gap-4">
            <TextArea label="Uvodni tekst" name="intro" rows={4} defaultValue={content.birthdays.intro} />
            <h3 className="mt-2 text-lg font-extrabold">Paketi</h3>
            <PackagesEditor initial={content.birthdays.packages} />
            <p className="text-sm text-ink-soft">Fotografije za stranicu Rođendani dodajte u Galeriju (kategorija „Rođendani”).</p>
            <SubmitButton className="btn-primary justify-self-start">Spremi rođendane</SubmitButton>
          </form>
        </section>

        <section id="faq" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="faq-h">
          <h2 id="faq-h" className="mb-4 text-2xl font-extrabold">Česta pitanja</h2>
          <form action={saveFaq} className="grid gap-4">
            <FaqEditor initial={content.faq} />
            <SubmitButton className="btn-primary justify-self-start">Spremi pitanja</SubmitButton>
          </form>
        </section>

        <section id="clanarina" className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby="cl-h">
          <h2 id="cl-h" className="mb-4 text-2xl font-extrabold">Članarina (tekst na stranici Upisi)</h2>
          <form action={savePricing} className="grid gap-4">
            <TextArea label="Tekst" name="pricingNote" rows={3} defaultValue={content.pricingNote} hint="Ne upisujte cijene dok ih ne potvrdite." />
            <SubmitButton className="btn-primary justify-self-start">Spremi</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
