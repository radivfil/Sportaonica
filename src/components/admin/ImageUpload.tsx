"use client";

import { useState } from "react";

/** Uploads an image to /api/admin/upload and stores the URL in a hidden input. */
export function ImageUpload({ name, initial }: { name: string; initial?: string }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json?.url) return setError(json?.error ?? "Učitavanje nije uspjelo.");
    setUrl(json.url);
  }

  return (
    <div className="grid gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" />
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-cream text-sm text-ink-soft">Nema slike</div>
      )}
      <label className="btn-secondary cursor-pointer">
        {busy ? "Učitavam…" : url ? "Zamijeni sliku" : "Odaberi sliku"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {url && (
        <button type="button" className="text-sm font-bold text-coral-700 underline" onClick={() => setUrl("")}>
          Ukloni sliku
        </button>
      )}
      {error && <p className="field-error">{error}</p>}
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
