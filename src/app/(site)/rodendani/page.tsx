import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { BirthdayForm } from "@/components/home/BirthdayForm";
import { Gallery } from "@/components/home/Gallery";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Icon } from "@/components/ui/Icon";
import { getContent, getGallery } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Dječji rođendani",
  description: "Sportski dječji rođendani u Sportaonici (Brckovljani, Sesvetski Kraljevec): igre, poligon i zabava. Pošaljite upit s datumom i brojem djece.",
  alternates: { canonical: "/rodendani" },
};

export default async function BirthdaysPage() {
  const [content, gallery] = await Promise.all([getContent(), getGallery()]);
  const photos = gallery.filter((g) => g.category === "rodendani");
  return (
    <>
      <PageHero title="Dječji rođendani" intro={content.birthdays.intro} crumbs={[{ name: "Rođendani", path: "/rodendani" }]} />

      <section aria-labelledby="paketi" className="container py-14 sm:py-16">
        <SectionHeading id="paketi" eyebrow="Paketi" title="Odaberite svoj rođendan" />
        <ul className="grid gap-6 md:grid-cols-2">
          {content.birthdays.packages.map((p, i) => (
            <li key={p.id} className={`card flex min-w-0 flex-col p-6 sm:p-8 ${i % 2 ? "bg-teal-50" : "bg-pink-50"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-extrabold [overflow-wrap:anywhere]">{p.name}</h3>
                <DemoBadge label="Potvrditi" />
              </div>
              <p className="mt-3 flex-1 whitespace-pre-line text-lg leading-relaxed text-ink-soft">{p.description}</p>
              {p.priceNote && (
                <p className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 font-extrabold text-ink">
                  <Icon name="star" className="h-5 w-5 text-coral" /> {p.priceNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {photos.length > 0 && (
        <section aria-labelledby="foto" className="container pb-14">
          <SectionHeading id="foto" eyebrow="Galerija" title="S naših proslava" />
          <Gallery images={photos} limit={8} />
        </section>
      )}

      <section aria-labelledby="upit" id="upit" className="scroll-mt-24 bg-butter-50 py-14 sm:py-16">
        <div className="container grid max-w-3xl gap-6">
          <SectionHeading id="upit-h" eyebrow="Upit" title="Pošaljite upit" intro="Upišite željeni datum, broj djece i dob slavljenika. Javit ćemo vam se sa slobodnim terminima i ponudom." />
          <BirthdayForm />
        </div>
      </section>
    </>
  );
}
