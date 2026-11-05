import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { Benefits } from "@/components/home/Benefits";
import { ProgramCards } from "@/components/home/ProgramCards";
import { LocationCards } from "@/components/home/LocationCards";
import { People } from "@/components/home/People";
import { PostCard } from "@/components/home/PostCard";
import { Gallery } from "@/components/home/Gallery";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { ContactInfo } from "@/components/home/ContactInfo";
import { ContactForm } from "@/components/home/ContactForm";
import { CtaBand } from "@/components/home/CtaBand";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Wave } from "@/components/ui/Wave";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActivities, getContent, getGallery, getLocations, getPublishedPosts, getSettings, getSlots } from "@/lib/queries";
import { faqLd, locationLd } from "@/lib/seo";
import { telHref } from "@/lib/format";

export default async function HomePage() {
  const [settings, content, activities, locations, slots, posts, gallery] = await Promise.all([
    getSettings(),
    getContent(),
    getActivities(),
    getLocations(),
    getSlots(),
    getPublishedPosts(3),
    getGallery(),
  ]);
  const kids = activities.filter((a) => a.audience === "kids");
  const adults = activities.filter((a) => a.audience === "adults");

  return (
    <>
      <Hero locationsCount={locations.length} programsCount={activities.length} />
      <Benefits />

      <Wave fill="#ffffff" />
      <section aria-labelledby="kids-title" className="cv-auto bg-white pb-16 pt-10 sm:pb-20">
        <div className="container">
          <SectionHeading id="kids-title" eyebrow="Za djecu" title="Programi za djecu" intro="Svaki program ima svoj dobni raspon. Grupe su male, a dob se provjerava pri prijavi." />
          <ProgramCards activities={kids} slots={slots} />
          <p className="mt-8 text-center">
            <Link href="/aktivnosti?za=djeca#programi" className="btn-secondary">
              Svi termini za djecu <Icon name="arrow-right" />
            </Link>
          </p>
        </div>
      </section>

      {adults.length > 0 && (
        <section aria-labelledby="adults-title" className="cv-auto bg-white pb-20 pt-6 sm:pb-24">
          <div className="container">
            <SectionHeading id="adults-title" eyebrow="Za odrasle" title="Programi za odrasle" intro="Dok su djeca na treningu ili u slobodno vrijeme: treninzi i radionice za odrasle." />
            <ProgramCards activities={adults} slots={slots} />
            <p className="mt-8 text-center">
              <Link href="/aktivnosti?za=odrasli#programi" className="btn-secondary">
                Svi termini za odrasle <Icon name="arrow-right" />
              </Link>
            </p>
          </div>
        </section>
      )}
      <Wave fill="#ffffff" flip />

      <section aria-labelledby="bday-title" className="cv-auto py-20 sm:py-24">
        <div className="container">
          <div className="grid items-center gap-8 rounded-[2.5rem] bg-pink-100 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
            <div className="min-w-0">
              <p className="eyebrow">Proslave</p>
              <h2 id="bday-title" className="mt-4 text-3xl font-extrabold sm:text-4xl">Dječji rođendani uz sport i igru</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink">{content.birthdays.intro}</p>
              <Link href="/rodendani#upit" className="btn-primary mt-6 !min-h-[56px]">
                Pošalji upit za rođendan <Icon name="arrow-right" />
              </Link>
            </div>
            <ul className="grid gap-3">
              {content.birthdays.packages.map((p) => (
                <li key={p.id} className="rounded-3xl bg-white p-5">
                  <p className="font-extrabold text-ink">{p.name}</p>
                  <p className="text-sm font-semibold text-ink-soft">{p.priceNote}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Wave fill="#F1FAF9" />
      <section aria-labelledby="locations-title" className="cv-auto bg-teal-50 pb-20 pt-10 sm:pb-24">
        <div className="container">
          <SectionHeading id="locations-title" eyebrow="Lokacije" title="Brckovljani i Sesvetski Kraljevec" intro="Odaberite lokaciju koja vam je najbliža." />
          <LocationCards locations={locations} slots={slots} activities={activities} />
        </div>
      </section>
      <Wave fill="#F1FAF9" flip />

      {content.about.people.length > 0 && (
        <section aria-labelledby="about-title" className="cv-auto py-20 sm:py-24">
          <div className="container">
            <h2 id="about-title" className="sr-only">O nama</h2>
            <People people={content.about.people.slice(0, 1)} headingLevel="h3" />
            <p className="mt-10 text-center">
              <Link href="/o-nama" className="btn-secondary">
                Više o nama <Icon name="arrow-right" />
              </Link>
            </p>
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <>
          <Wave fill="#FFF5F8" />
          <section aria-labelledby="news-title" className="cv-auto bg-pink-50 pb-20 pt-10 sm:pb-24">
            <div className="container">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <SectionHeading id="news-title" eyebrow="Novosti" title="Obavijesti i novosti" align="left" />
                <Link href="/novosti" className="btn-secondary mb-10 sm:mb-12">
                  Sve novosti <Icon name="arrow-right" />
                </Link>
              </div>
              <ul className="grid gap-6 md:grid-cols-3">
                {posts.map((p, i) => (
                  <Reveal as="li" key={p.id} delay={i * 0.08}>
                    <PostCard post={p} />
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
          <Wave fill="#FFF5F8" flip />
        </>
      )}

      {gallery.length > 0 && (
        <section aria-labelledby="gallery-title" className="cv-auto py-20 sm:py-24">
          <div className="container">
            <SectionHeading id="gallery-title" eyebrow="Galerija" title="Osmijesi s treninga" />
            <Gallery images={gallery} limit={8} />
            <div className="mt-8 text-center">
              <Link href="/galerija" className="btn-secondary">
                Cijela galerija <Icon name="arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Wave fill="#FFFBEA" />
      <section aria-labelledby="faq-title" className="cv-auto bg-butter-50 pb-20 pt-10 sm:pb-24">
        <div className="container max-w-3xl">
          <SectionHeading id="faq-title" eyebrow="Česta pitanja" title="Imate pitanje?" intro="Najčešća pitanja roditelja na jednom mjestu." />
          <FaqAccordion items={content.faq.slice(0, 6)} />
          <p className="mt-8 text-center">
            <Link href="/cesta-pitanja" className="font-bold text-navy underline underline-offset-4">
              Sva pitanja i odgovori
            </Link>
          </p>
        </div>
      </section>
      <Wave fill="#FFFBEA" flip />

      <section aria-labelledby="contact-title" className="cv-auto py-20 sm:py-24">
        <div className="container">
          <SectionHeading id="contact-title" eyebrow="Kontakt" title="Javite nam se" intro="Rado ćemo odgovoriti na sva pitanja o programima, terminima i upisima." />
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0">
            <ContactInfo settings={settings} />
            <ContactForm />
          </div>
        </div>
      </section>

      <CtaBand telHref={telHref(settings.phone)} phone={settings.phone} />

      <JsonLd data={locations.map((l) => locationLd(l, settings))} />
      <JsonLd data={faqLd(content.faq.slice(0, 6))} />
    </>
  );
}
