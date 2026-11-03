import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Gallery } from "@/components/home/Gallery";
import { GALLERY } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Galerija",
  description: "Fotografije s treninga Sportaonice — igra, kretanje i osmijesi.",
  alternates: { canonical: "/galerija" },
};

export default function GalleryPage() {
  return (
    <>
      <PageHero title="Galerija" intro="Trenuci s naših treninga. Fotografije djece objavljujemo isključivo uz pisanu privolu roditelja." crumbs={[{ name: "Galerija", path: "/galerija" }]} />
      <div className="container py-16">
        <Gallery images={GALLERY} priorityCount={2} />
      </div>
    </>
  );
}
