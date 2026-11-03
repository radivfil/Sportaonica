import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { LocationCards } from "@/components/home/LocationCards";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActivities, getLocations, getSettings, getSlots } from "@/lib/queries";
import { locationLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Lokacije — Božjakovina, Brckovljani, Sesvetski Kraljevec",
  description: "Sport za djecu u Brckovljanima, Božjakovini i Sesvetskom Kraljevcu. Adrese dvorana, raspored treninga i karta.",
  alternates: { canonical: "/lokacije" },
};

export default async function LocationsPage() {
  const [locations, slots, activities, settings] = await Promise.all([getLocations(), getSlots(), getActivities(), getSettings()]);
  return (
    <>
      <PageHero
        title="Lokacije"
        intro="Treninge održavamo na tri lokacije u okolici Sesvetskog Kraljevca i Dugog Sela. Odaberite onu koja vam je najbliža."
        crumbs={[{ name: "Lokacije", path: "/lokacije" }]}
      />
      <div className="container py-16">
        <LocationCards locations={locations} slots={slots} activities={activities} headingLevel="h2" />
      </div>
      <JsonLd data={locations.map((l) => locationLd(l, slots, settings))} />
    </>
  );
}
