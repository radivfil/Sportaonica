"use client";

import { useState, useTransition } from "react";
import type { GalleryImage } from "@/lib/data/types";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/data/types";
import { addGalleryImages, deleteGalleryImage, reorderGallery, updateGalleryImage } from "@/app/admin/actions";
import { uploadImages } from "./MultiImageField";

type Pending = { url: string; width: number; height: number; name: string; alt: string };

/** Upload (several at once, alt text required), edit, delete and drag-to-reorder gallery images. */
export function GalleryManager({ images }: { images: GalleryImage[] }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState(images);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState("");

  async function onFiles(files: FileList) {
    setBusy(true);
    setError(null);
    const res = await uploadImages(files);
    setBusy(false);
    if (res.error) setError(res.error);
    setPending((p) => [...p, ...res.files.map((f) => ({ ...f, alt: "" }))]);
  }

  function persist(next: GalleryImage[]) {
    setOrder(next);
    startSaving(async () => {
      await reorderGallery(next.map((g) => g.id));
      setStatus("Redoslijed je spremljen.");
    });
  }
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const c = [...order];
    [c[i], c[j]] = [c[j], c[i]];
    persist(c);
  };

  return (
    <div className="grid gap-8">
      <section className="card grid gap-4 p-5 sm:p-8" aria-labelledby="up-h">
        <h2 id="up-h" className="text-2xl font-extrabold">Dodaj slike</h2>
        <label className="btn-primary cursor-pointer justify-self-start">
          {busy ? "Učitavam…" : "Odaberi slike (može više)"}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.length && onFiles(e.target.files)} />
        </label>
        <p className="text-sm text-ink-soft">JPG, PNG ili WebP, do 5 MB po slici. Fotografije djece objavljujte samo uz pisanu privolu roditelja.</p>
        {error && <p className="field-error">{error}</p>}
        {pending.length > 0 && (
          <form action={addGalleryImages} className="grid gap-4">
            <ul className="grid gap-3 sm:grid-cols-2">
              {pending.map((p, i) => (
                <li key={p.url} className="grid grid-cols-[88px_1fr] gap-3 rounded-2xl bg-cream p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="aspect-square w-[88px] rounded-xl object-cover" />
                  <div className="grid min-w-0 gap-1">
                    <input type="hidden" name="src" value={p.url} />
                    <input type="hidden" name="width" value={p.width} />
                    <input type="hidden" name="height" value={p.height} />
                    <label htmlFor={`palt-${i}`} className="text-sm font-bold">Opis slike (alternativni tekst) *</label>
                    <input
                      id={`palt-${i}`}
                      name="alt"
                      required
                      minLength={3}
                      maxLength={200}
                      value={p.alt}
                      onChange={(e) => setPending((arr) => arr.map((x) => (x.url === p.url ? { ...x, alt: e.target.value } : x)))}
                      placeholder="Što je na slici?"
                      className="field"
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="new-cat" className="field-label">Kategorija</label>
                <select id="new-cat" name="category" className="field" defaultValue="treninzi">
                  {GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <button className="btn-navy">Spremi u galeriju</button>
              <button type="button" className="btn-ghost" onClick={() => setPending([])}>Odustani</button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="list-h">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="list-h" className="text-2xl font-extrabold">Slike u galeriji ({order.length})</h2>
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            {saving ? "Spremam redoslijed…" : status || "Povucite sliku ili koristite strelice za promjenu redoslijeda."}
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {order.map((g, i) => (
            <li
              key={g.id}
              draggable
              onDragStart={() => setDragId(g.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === g.id) return;
                const c = order.filter((x) => x.id !== dragId);
                const dragged = order.find((x) => x.id === dragId)!;
                c.splice(c.findIndex((x) => x.id === g.id), 0, dragged);
                setDragId(null);
                persist(c);
              }}
              className={`card grid cursor-grab grid-cols-[96px_1fr] gap-3 p-3 ${dragId === g.id ? "opacity-50" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.src} alt="" className="aspect-square w-24 rounded-xl object-cover" />
              <div className="grid min-w-0 gap-2">
                <form action={updateGalleryImage} className="grid gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <label htmlFor={`alt-${g.id}`} className="text-sm font-bold">Opis slike *</label>
                  <input id={`alt-${g.id}`} name="alt" defaultValue={g.alt} required minLength={3} maxLength={200} className="field" />
                  <div className="flex flex-wrap gap-2">
                    <select name="category" defaultValue={g.category} aria-label="Kategorija" className="field !w-auto">
                      {GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</option>)}
                    </select>
                    <button className="btn !min-h-[44px] bg-white !px-3 text-sm text-navy ring-1 ring-ink/15">Spremi</button>
                  </div>
                </form>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => move(i, -1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni sliku ${i + 1} naprijed`}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni sliku ${i + 1} natrag`}>↓</button>
                  <form
                    action={deleteGalleryImage}
                    onSubmit={(e) => {
                      if (!window.confirm("Ukloniti sliku iz galerije?")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <button className="btn !min-h-[40px] bg-coral-100 !px-3 text-sm text-coral-700">Ukloni</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
