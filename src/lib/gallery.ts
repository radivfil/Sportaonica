/**
 * Gallery images. TODO(client): replace the files in /public/gallery with real
 * photos (same names) or edit this list. Use landscape 1600×1200 or portrait
 * 1200×1600 JPGs; Next.js converts them to AVIF/WebP automatically.
 * Photos of children require written parental consent before publishing!
 */
export interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const GALLERY: GalleryImage[] = [
  { src: "/gallery/galerija-01.jpg", alt: "Djeca na zagrijavanju u dvorani (privremena ilustracija)", width: 1600, height: 1200 },
  { src: "/gallery/galerija-02.jpg", alt: "Igre s loptom za najmlađe (privremena ilustracija)", width: 1200, height: 1600 },
  { src: "/gallery/galerija-03.jpg", alt: "Poligon spretnosti (privremena ilustracija)", width: 1600, height: 1200 },
  { src: "/gallery/galerija-04.jpg", alt: "Mini rukomet — šut na gol (privremena ilustracija)", width: 1600, height: 1200 },
  { src: "/gallery/galerija-05.jpg", alt: "Timska igra i suradnja (privremena ilustracija)", width: 1200, height: 1600 },
  { src: "/gallery/galerija-06.jpg", alt: "Vježbe ravnoteže (privremena ilustracija)", width: 1600, height: 1200 },
  { src: "/gallery/galerija-07.jpg", alt: "Zajednička fotografija grupe (privremena ilustracija)", width: 1600, height: 1200 },
  { src: "/gallery/galerija-08.jpg", alt: "Osmijesi nakon treninga (privremena ilustracija)", width: 1200, height: 1600 },
];
