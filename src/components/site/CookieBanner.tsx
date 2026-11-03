"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sp-consent-v1";
export type Consent = { necessary: true; analytics: boolean; date: string };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

/**
 * GDPR cookie notice. The site sets NO tracking cookies; analytics (if ever
 * added) must only load after `readConsent()?.analytics === true`.
 * Reopen from anywhere with: window.dispatchEvent(new Event("open-cookie-settings"))
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setOpen(true);
    else setAnalytics(existing.analytics);
    const reopen = () => {
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("open-cookie-settings", reopen);
    return () => window.removeEventListener("open-cookie-settings", reopen);
  }, []);

  const save = (a: boolean) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ necessary: true, analytics: a, date: new Date().toISOString() }));
    } catch {
      /* storage blocked — banner will show again next visit */
    }
    setAnalytics(a);
    setOpen(false);
    window.dispatchEvent(new Event("consent-changed"));
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="no-print fixed inset-x-3 bottom-[88px] z-50 mx-auto max-w-xl rounded-3xl border border-ink/10 bg-white p-5 shadow-lift sm:bottom-6 lg:inset-x-auto lg:right-6"
    >
      <h2 id="cookie-title" className="text-lg font-extrabold">Kolačići 🍪</h2>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
        Koristimo samo nužne kolačiće potrebne za rad stranice. Analitičke kolačiće uključujemo isključivo uz vašu privolu.{" "}
        <Link href="/politika-privatnosti#kolacici" className="font-bold text-navy underline underline-offset-2">
          Saznajte više
        </Link>
      </p>
      {details && (
        <fieldset className="mt-4 grid gap-3 rounded-2xl bg-pink-50 p-4">
          <legend className="sr-only">Postavke kolačića</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked disabled className="mt-1 h-5 w-5 accent-navy" />
            <span>
              <strong>Nužni</strong>
              <span className="block text-sm text-ink-soft">Potrebni za osnovni rad stranice i prijavu u admin. Uvijek uključeni.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-5 w-5 accent-navy" />
            <span>
              <strong>Analitički</strong>
              <span className="block text-sm text-ink-soft">Anonimna statistika posjeta. Trenutno se ne koriste.</span>
            </span>
          </label>
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-navy !min-h-[44px] flex-1" onClick={() => save(true)}>
          Prihvati sve
        </button>
        <button type="button" className="btn-secondary !min-h-[44px] flex-1" onClick={() => save(details ? analytics : false)}>
          {details ? "Spremi odabir" : "Samo nužni"}
        </button>
        {!details && (
          <button type="button" className="btn-ghost !min-h-[44px] w-full text-sm underline" onClick={() => setDetails(true)}>
            Postavke
          </button>
        )}
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}>
      Postavke kolačića
    </button>
  );
}
