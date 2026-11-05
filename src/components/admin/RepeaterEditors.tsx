"use client";

import { useState } from "react";
import type { BirthdayPackage, Person } from "@/lib/data/types";
import { ImageUpload } from "./ImageUpload";

function useList<T extends { id: string }>(initial: T[], blank: () => T) {
  const [items, setItems] = useState(initial);
  const move = (i: number, d: number) =>
    setItems((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const c = [...arr];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  return {
    items,
    move,
    remove: (id: string) => setItems((arr) => arr.filter((x) => x.id !== id)),
    add: () => setItems((arr) => [...arr, blank()]),
  };
}

function RowButtons({ i, label, move, remove }: { i: number; label: string; move: (i: number, d: number) => void; remove: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => move(i, -1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni ${label} gore`}>↑ Gore</button>
      <button type="button" onClick={() => move(i, 1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni ${label} dolje`}>↓ Dolje</button>
      <button type="button" onClick={remove} className="btn !min-h-[40px] bg-coral-100 !px-3 text-sm text-coral-700">Ukloni</button>
    </div>
  );
}

/** "O nama": owner, trainers… each with photo + alt text. */
export function PeopleEditor({ initial }: { initial: Person[] }) {
  const { items, move, remove, add } = useList(initial, () => ({ id: `person-new-${Date.now()}`, name: "", role: "", bio: "", highlights: [] }));
  return (
    <div className="grid gap-4">
      {items.map((p, i) => (
        <fieldset key={p.id} className="grid gap-3 rounded-3xl bg-cream p-4 lg:grid-cols-[1fr_240px]">
          <legend className="sr-only">Osoba {i + 1}</legend>
          <input type="hidden" name="personId" value={p.id} />
          <div className="grid min-w-0 gap-3">
            <label className="field-label !mb-0" htmlFor={`pn-${p.id}`}>Ime i prezime</label>
            <input id={`pn-${p.id}`} name="personName" defaultValue={p.name} className="field" required />
            <label className="field-label !mb-0" htmlFor={`pr-${p.id}`}>Uloga (npr. vlasnica, trener)</label>
            <input id={`pr-${p.id}`} name="personRole" defaultValue={p.role} className="field" />
            <label className="field-label !mb-0" htmlFor={`pb-${p.id}`}>Opis (odlomke odvojite praznim redom)</label>
            <textarea id={`pb-${p.id}`} name="personBio" defaultValue={p.bio} rows={5} className="field" />
            <label className="field-label !mb-0" htmlFor={`ph-${p.id}`}>Istaknuto (jedna stavka po retku, npr. kvalifikacije)</label>
            <textarea id={`ph-${p.id}`} name="personHighlights" defaultValue={p.highlights.join("\n")} rows={3} className="field" />
            <RowButtons i={i} label={`osobu ${i + 1}`} move={move} remove={() => remove(p.id)} />
          </div>
          <div className="grid content-start gap-2">
            <span className="field-label">Fotografija</span>
            <ImageUpload name="personPhoto" initial={p.photo} />
            <label className="field-label !mb-0" htmlFor={`pa-${p.id}`}>Opis fotografije (alt)</label>
            <input id={`pa-${p.id}`} name="personPhotoAlt" defaultValue={p.photoAlt} className="field" placeholder="Npr. Vlasnica s loptom u dvorani" />
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={add} className="btn-secondary justify-self-start">+ Dodaj osobu</button>
    </div>
  );
}

/** Birthday packages (texts are placeholders until the client confirms them). */
export function PackagesEditor({ initial }: { initial: BirthdayPackage[] }) {
  const { items, move, remove, add } = useList(initial, () => ({ id: `pkg-new-${Date.now()}`, name: "", description: "", priceNote: "" }));
  return (
    <div className="grid gap-4">
      {items.map((p, i) => (
        <fieldset key={p.id} className="grid gap-3 rounded-3xl bg-cream p-4">
          <legend className="sr-only">Paket {i + 1}</legend>
          <input type="hidden" name="pkgId" value={p.id} />
          <label className="field-label !mb-0" htmlFor={`kn-${p.id}`}>Naziv paketa</label>
          <input id={`kn-${p.id}`} name="pkgName" defaultValue={p.name} className="field" />
          <label className="field-label !mb-0" htmlFor={`kd-${p.id}`}>Opis (trajanje, broj djece, što je uključeno)</label>
          <textarea id={`kd-${p.id}`} name="pkgDescription" defaultValue={p.description} rows={3} className="field" />
          <label className="field-label !mb-0" htmlFor={`kp-${p.id}`}>Cijena ili napomena (npr. „Cijena na upit”)</label>
          <input id={`kp-${p.id}`} name="pkgPrice" defaultValue={p.priceNote} className="field" />
          <RowButtons i={i} label={`paket ${i + 1}`} move={move} remove={() => remove(p.id)} />
        </fieldset>
      ))}
      <button type="button" onClick={add} className="btn-secondary justify-self-start">+ Dodaj paket</button>
    </div>
  );
}
