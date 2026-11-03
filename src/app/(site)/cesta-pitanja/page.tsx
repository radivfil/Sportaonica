import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { getContent, getSettings } from "@/lib/queries";
import { faqLd } from "@/lib/seo";
import { telHref } from "@/lib/format";

export const metadata: Metadata = {
  title: "Česta pitanja roditelja",
  description: "Za koju je dob program, što ponijeti na trening, kako funkcioniraju prijave, otkazivanje, sigurnost i članarina.",
  alternates: { canonical: "/cesta-pitanja" },
};

export default async function FaqPage() {
  const [content, settings] = await Promise.all([getContent(), getSettings()]);
  return (
    <>
      <PageHero title="Česta pitanja" intro="Odgovori na pitanja koja roditelji najčešće postavljaju." crumbs={[{ name: "Česta pitanja", path: "/cesta-pitanja" }]} />
      <div className="container max-w-3xl py-16">
        <FaqAccordion items={content.faq} />
        <div className="mt-12 rounded-4xl bg-teal-100 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-extrabold">Niste pronašli odgovor?</h2>
          <p className="mt-2 text-ink">Nazovite nas ili pošaljite poruku — rado ćemo pomoći.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={telHref(settings.phone)} className="btn-navy">
              <Icon name="phone" /> {settings.phone}
            </a>
            <Link href="/kontakt" className="btn-secondary">Pošalji poruku</Link>
          </div>
        </div>
      </div>
      <JsonLd data={faqLd(content.faq)} />
    </>
  );
}
