import { adminRepo } from "@/lib/data";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { GalleryManager } from "@/components/admin/GalleryManager";

export const metadata = { title: "Galerija" };

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const images = await (await adminRepo()).listGallery();
  return (
    <>
      <PageTitle title="Galerija" intro="Slike na stranici Galerija i Rođendani. Svaka slika mora imati kratki opis za slabovidne i tražilice." />
      <Flash ok={sp.ok} error={sp.error} />
      <GalleryManager images={images} />
    </>
  );
}
