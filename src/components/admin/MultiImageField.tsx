"use client";

import { useState } from "react";
import type { ImageRef } from "@/lib/data/types";

export async function uploadImages(files: FileList | File[]): Promise<{ files: { url: string; width: number; height: number; name: string }[]; error?: string }> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append("file", f);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.files) return { files: [], error: json?.error ?? "Učitavanje nije uspjelo." };
  return { files: json.files };
}

/**
 * Several images with a REQUIRED alt text each (post gallery). Submitted as
 * parallel arrays imageSrc[] / imageAlt[] to the server action.
 */
export function MultiImageField({ initial }: { initial: ImageRef[] }) {
  const [items, setItems] = useState<(ImageRef & { key: string })[]>(initial.map((x, i) => ({ ...x, key: `i${i}` })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList) {
    setBusy(true);
    setError(null);
    const res = await uploadImages(files);
    setBusy(false);
    if (res.error) setError(res.error);
    setItems((arr) => [...arr, ...res.files.map((f) => ({ src: f.url, alt: "", key: f.url }))]);
  }
  const move = (i: number, d: number) =>
    setItems((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const c = [...arr];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  return (
    <div className="grid gap-3">
      {items.length === 0 && <p className="text-sm text-ink-soft">Nema dodatnih slika.</p>}
      <ul className="grid gap-3">
        {items.map((img, i) => (
          <li key={img.key} className="grid gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[96px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="" className="aspect-square w-24 rounded-xl object-cover" />
            <div className="grid min-w-0 gap-2">
              <input type="hidden" name="imageSrc" value={img.src} />
              <label className="field-label !mb-0" htmlFor={`alt-${img.key}`}>
                Opis slike (alternativni tekst) *
              </label>
              <input
                id={`alt-${img.key}`}
                name="imageAlt"
                required
                minLength={3}
                maxLength={200}
                value={img.alt}
                onChange={(e) => setItems((arr) => arr.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))}
                placeholder="Npr. Djeca na poligonu u dvorani"
                className="field"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => move(i, -1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni sliku ${i + 1} gore`}>↑</button>
                <button type="button" onClick={() => move(i, 1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni sliku ${i + 1} dolje`}>↓</button>
                <button type="button" onClick={() => setItems((arr) => arr.filter((x) => x.key !== img.key))} className="btn !min-h-[40px] bg-coral-100 !px-3 text-sm text-coral-700">
                  Ukloni
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <label className="btn-secondary cursor-pointer justify-self-start">
        {busy ? "Učitavam…" : "+ Dodaj slike"}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.length && onFiles(e.target.files)} />
      </label>
      <p className="text-sm text-ink-soft">JPG, PNG ili WebP, najviše 5 MB po slici. Fotografije djece objavljujte samo uz pisanu privolu roditelja.</p>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
