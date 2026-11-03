import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { ContactInfo } from "@/components/home/ContactInfo";
import { ContactForm } from "@/components/home/ContactForm";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Nazovite nas na 099 878 1025 ili pišite na sportaonica@gmail.com. Odgovaramo na sva pitanja o programu, terminima i upisima.",
  alternates: { canonical: "/kontakt" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero title="Kontakt" intro="Imate pitanje o programu, terminima ili upisima? Javite nam se!" crumbs={[{ name: "Kontakt", path: "/kontakt" }]} />
      <div className="container grid gap-8 py-16 lg:grid-cols-[1fr_1.4fr]">
        <ContactInfo settings={settings} />
        <ContactForm headingLevel="h2" />
      </div>
    </>
  );
}
