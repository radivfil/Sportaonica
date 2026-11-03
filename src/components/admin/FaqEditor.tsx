"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/data/types";

/** Add / remove / reorder FAQ rows; submitted as parallel arrays to a server action. */
export function FaqEditor({ initial }: { initial: FaqItem[] }) {
  const [items, setItems] = useState(initial.map((f) => ({ ...f })));
  const move = (i: number, d: number) =>
    setItems((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  return (
    <div className="grid gap-4">
      {items.map((f, i) => (
        <fieldset key={f.id} className="grid gap-3 rounded-3xl bg-cream p-4">
          <legend className="sr-only">Pitanje {i + 1}</legend>
          <input type="hidden" name="faqId" value={f.id} />
          <label className="field-label" htmlFor={`q-${f.id}`}>Pitanje {i + 1}</label>
          <input id={`q-${f.id}`} name="question" defaultValue={f.question} className="field -mt-2" />
          <label className="field-label" htmlFor={`a-${f.id}`}>Odgovor</label>
          <textarea id={`a-${f.id}`} name="answer" defaultValue={f.answer} rows={3} className="field -mt-2" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => move(i, -1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni pitanje ${i + 1} gore`}>↑ Gore</button>
            <button type="button" onClick={() => move(i, 1)} className="btn !min-h-[40px] bg-white !px-3 text-sm ring-1 ring-ink/15" aria-label={`Pomakni pitanje ${i + 1} dolje`}>↓ Dolje</button>
            <button type="button" onClick={() => setItems((arr) => arr.filter((x) => x.id !== f.id))} className="btn !min-h-[40px] bg-coral-100 !px-3 text-sm text-coral-700">Ukloni</button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => setItems((arr) => [...arr, { id: `faq-new-${Date.now()}`, question: "", answer: "" }])}
        className="btn-secondary justify-self-start"
      >
        + Dodaj pitanje
      </button>
    </div>
  );
}
