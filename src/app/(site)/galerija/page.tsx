import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { Gallery } from "@/components/home/Gallery";
import { getGallery } from "@/lib/queries";
import { STATIC_DEMO } from "@/lib/site";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS, type GalleryCategory } from "@/lib/data/types";

export const metadata: Metadata = {
  title: "Galerija",
  description: "Fotografije s treninga, radionica i rođendana u Sportaonici.",
  alternates: { canonical: "/galerija" },
};

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ kategorija?: string }> }) {
  const { kategorija } = await searchParams;
  const all = await getGallery();
  const used = GALLERY_CATEGORIES.filter((c) => all.some((g) => g.category === c));
  const active = used.includes(kategorija as GalleryCategory) ? (kategorija as GalleryCategory) : undefined;
  const images = active ? all.filter((g) => g.category === active) : all;
  const chip = (on: boolean) => `inline-flex min-h-[44px] items-center rounded-full px-4 font-bold ${on ? "bg-navy text-white" : "bg-white text-ink ring-1 ring-ink/15"}`;
  return (
    <>
      <PageHero title="Galerija" intro="Trenuci s naših treninga i proslava. Fotografije djece objavljujemo isključivo uz pisanu privolu roditelja." crumbs={[{ name: "Galerija", path: "/galerija" }]} />
      <div className="container py-12 sm:py-16">
        {used.length > 1 && !STATIC_DEMO && (
          <nav aria-label="Kategorije" className="mb-8 flex flex-wrap gap-2">
            <Link href="/galerija" aria-current={!active ? "true" : undefined} className={chip(!active)}>Sve</Link>
            {used.map((c) => (
              <Link key={c} href={`/galerija?kategorija=${c}`} aria-current={active === c ? "true" : undefined} className={chip(active === c)}>
                {GALLERY_CATEGORY_LABELS[c]}
              </Link>
            ))}
          </nav>
        )}
        {images.length ? <Gallery images={images} priorityCount={2} /> : <p className="text-ink-soft">Galerija je trenutno prazna.</p>}
      </div>
    </>
  );
}
