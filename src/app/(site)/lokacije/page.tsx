import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { LocationCards } from "@/components/home/LocationCards";
import { JsonLd } from "@/components/seo/JsonLd";
import { getActivities, getLocations, getSettings, getSlots } from "@/lib/queries";
import { locationLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Lokacije: Brckovljani i Sesvetski Kraljevec",
  description: "Sportaonica u Brckovljanima (Sportska ulica 1, novi tržni centar) i Sesvetskom Kraljevcu (Dugoselska cesta 44a). Adrese, radno vrijeme i programi.",
  alternates: { canonical: "/lokacije" },
};

export default async function LocationsPage() {
  const [locations, slots, activities, settings] = await Promise.all([getLocations(), getSlots(), getActivities(), getSettings()]);
  return (
    <>
      <PageHero title="Lokacije" intro="Programe održavamo na dvije lokacije. Odaberite onu koja vam je najbliža." crumbs={[{ name: "Lokacije", path: "/lokacije" }]} />
      <div className="container py-16">
        <LocationCards locations={locations} slots={slots} activities={activities} headingLevel="h2" />
      </div>
      <JsonLd data={locations.map((l) => locationLd(l, settings))} />
    </>
  );
}
