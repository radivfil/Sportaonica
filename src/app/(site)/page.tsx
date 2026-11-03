import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { Benefits } from "@/components/home/Benefits";
import { ActivitiesGrid } from "@/components/home/ActivitiesGrid";
import { ScheduleTeaser } from "@/components/home/ScheduleTeaser";
import { LocationCards } from "@/components/home/LocationCards";
import { TrainerBlock } from "@/components/home/TrainerBlock";
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
import { GALLERY } from "@/lib/gallery";
import { getActivities, getContent, getLocations, getPublishedPosts, getSettings, getSlots } from "@/lib/queries";
import { locationLd } from "@/lib/seo";
import { telHref } from "@/lib/format";

export default async function HomePage() {
  const [settings, content, activities, locations, slots, posts] = await Promise.all([
    getSettings(),
    getContent(),
    getActivities(),
    getLocations(),
    getSlots(),
    getPublishedPosts(3),
  ]);

  return (
    <>
      <Hero locationsCount={locations.length} />
      <Benefits />

      <Wave fill="#ffffff" />
      <section aria-labelledby="activities-title" className="bg-white pb-20 pt-10 sm:pb-24">
        <div className="container">
          <SectionHeading
            id="activities-title"
            eyebrow="Aktivnosti"
            title="Programi prilagođeni svakoj dobi"
            intro="Od prvih igara s loptom do mini rukometa — grupe su formirane prema dobi, a broj djece u grupi je ograničen."
          />
          <ActivitiesGrid activities={activities} slots={slots} />
        </div>
      </section>
      <Wave fill="#ffffff" flip />

      <section aria-labelledby="schedule-title" className="py-20 sm:py-24">
        <div className="container">
          <SectionHeading
            id="schedule-title"
            eyebrow="Termini i upisi"
            title="Slobodna mjesta u stvarnom vremenu"
            intro="Odaberite termin i prijavite dijete online. Kad je termin pun, upišite se na listu čekanja — javljamo se čim se mjesto oslobodi."
          />
          <ScheduleTeaser slots={slots} activities={activities} locations={locations} />
          <div className="mt-10 text-center">
            <Link href="/upisi" className="btn-primary !min-h-[56px] !px-8 !text-lg">
              Prijavi dijete <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <Wave fill="#F1FAF9" />
      <section aria-labelledby="locations-title" className="bg-teal-50 pb-20 pt-10 sm:pb-24">
        <div className="container">
          <SectionHeading id="locations-title" eyebrow="Lokacije" title="Blizu vas — na tri lokacije" intro="Treninge održavamo u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu." />
          <LocationCards locations={locations} slots={slots} activities={activities} />
        </div>
      </section>
      <Wave fill="#F1FAF9" flip />

      <section aria-labelledby="trainer-title" className="py-20 sm:py-24">
        <div className="container">
          <TrainerBlock trainer={content.trainer} />
        </div>
      </section>

      {posts.length > 0 && (
        <>
          <Wave fill="#FFF5F8" />
          <section aria-labelledby="news-title" className="bg-pink-50 pb-20 pt-10 sm:pb-24">
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

      <section aria-labelledby="gallery-title" className="py-20 sm:py-24">
        <div className="container">
          <SectionHeading id="gallery-title" eyebrow="Galerija" title="Osmijesi s treninga" />
          <Gallery images={GALLERY} limit={8} />
          <div className="mt-8 text-center">
            <Link href="/galerija" className="btn-secondary">
              Cijela galerija <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <Wave fill="#FFFBEA" />
      <section aria-labelledby="faq-title" className="bg-butter-50 pb-20 pt-10 sm:pb-24">
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

      <section aria-labelledby="contact-title" className="py-20 sm:py-24">
        <div className="container">
          <SectionHeading id="contact-title" eyebrow="Kontakt" title="Javite nam se" intro="Rado ćemo odgovoriti na sva pitanja o programu, terminima i upisima." />
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <ContactInfo settings={settings} />
            <ContactForm />
          </div>
        </div>
      </section>

      <CtaBand telHref={telHref(settings.phone)} phone={settings.phone} />

      {locations.map((l) => (
        <JsonLd key={l.id} data={locationLd(l, slots, settings)} />
      ))}
    </>
  );
}
