"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";
import { asset } from "@/lib/site";

/** Responsive masonry-like grid + accessible lightbox (native <dialog>, keyboard + swipe). */
export function Gallery({ images, limit, priorityCount = 0 }: { images: Pick<GalleryImage, "id" | "src" | "alt" | "width" | "height">[]; limit?: number; priorityCount?: number }) {
  const shown = limit ? images.slice(0, limit) : images;
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + shown.length) % shown.length)), [shown.length]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const onClose = () => setIndex(null);
    dlg.addEventListener("keydown", onKey);
    dlg.addEventListener("close", onClose);
    return () => {
      dlg.removeEventListener("keydown", onKey);
      dlg.removeEventListener("close", onClose);
    };
  }, [go]);

  const current = index !== null ? shown[index] : null;

  return (
    <>
      <ul className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 [&>li]:mb-3 sm:[&>li]:mb-4">
        {shown.map((img, i) => (
          <li key={img.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => open(i)}
              className="group relative block w-full overflow-hidden rounded-3xl bg-pink-100 shadow-soft"
              aria-label={`Povećaj fotografiju: ${img.alt}`}
            >
              <Image
                src={asset(img.src)}
                alt={img.alt}
                width={img.width}
                height={img.height}
                priority={i < priorityCount}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 290px"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-navy/0 transition group-hover:bg-navy/10" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Galerija fotografija"
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-navy-900/90"
        onClick={(e) => e.target === dialogRef.current && close()}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {current && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4" onClick={(e) => e.target === e.currentTarget && close()}>
            <figure className="relative flex max-h-[80vh] w-full max-w-5xl flex-col items-center">
              <Image
                key={current.src}
                src={asset(current.src)}
                alt={current.alt}
                width={current.width}
                height={current.height}
                sizes="100vw"
                className="h-auto max-h-[75vh] w-auto rounded-3xl object-contain"
              />
              <figcaption className="mt-3 text-center font-semibold text-white">
                {current.alt} <span className="text-white/70">({index! + 1}/{shown.length})</span>
              </figcaption>
            </figure>
            <div className="flex gap-3">
              <button type="button" onClick={() => go(-1)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy" aria-label="Prethodna fotografija">
                <Icon name="arrow-left" />
              </button>
              <button type="button" onClick={close} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-navy" aria-label="Zatvori galeriju">
                <Icon name="close" /> Zatvori
              </button>
              <button type="button" onClick={() => go(1)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy" aria-label="Sljedeća fotografija">
                <Icon name="arrow-right" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
