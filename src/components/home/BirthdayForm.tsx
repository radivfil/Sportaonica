"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Turnstile } from "@/components/ui/Turnstile";
import { STATIC_DEMO } from "@/lib/site";

/** Birthday party inquiry → admin "Upiti i rođendani". */
export function BirthdayForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string>();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setMessage(null);
    if (STATIC_DEMO) {
      // static design preview: no server, simulate a successful send
      await new Promise((r) => setTimeout(r, 700));
      setState("sent");
      return;
    }
    const res = await fetch("/api/birthday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        eventDate: fd.get("eventDate"),
        childrenCount: fd.get("childrenCount"),
        childAge: fd.get("childAge"),
        message: fd.get("message"),
        privacy: fd.get("privacy") === "on",
        website: fd.get("website"),
        startedAt: startedAt.current,
        turnstileToken: token,
      }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.ok) return setState("sent");
    setState("idle");
    setErrors(json?.fieldErrors ?? {});
    setMessage(json?.message ?? "Upit nije poslan. Pokušajte ponovno ili nas nazovite.");
  }

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center p-8 text-center" data-testid="birthday-sent">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-200">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h3 className="mt-4 text-2xl font-extrabold">Upit je poslan!</h3>
        <p className="mt-2 text-ink-soft">Javit ćemo vam se sa slobodnim terminima i ponudom.</p>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="min-w-0">
      <label htmlFor={`b-${name}`} className="field-label">
        {label} {props.required && <span className="text-coral-700" aria-hidden="true">*</span>}
      </label>
      <input id={`b-${name}`} name={name} className="field" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `b-${name}-err` : undefined} {...props} />
      {errors[name] && (
        <p id={`b-${name}-err`} className="field-error">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="card grid gap-4 p-6 sm:p-8">
      <h3 className="text-2xl font-extrabold">Upit za rođendan</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("eventDate", "Željeni datum", { type: "date", min: today, required: true })}
        {field("childrenCount", "Broj djece", { type: "number", min: 1, max: 100, inputMode: "numeric", required: true })}
        {field("childAge", "Dob slavljenika", { type: "number", min: 1, max: 18, inputMode: "numeric", required: true })}
      </div>
      {field("name", "Ime i prezime roditelja", { autoComplete: "name", required: true })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("phone", "Mobitel", { type: "tel", autoComplete: "tel", inputMode: "tel", required: true })}
        {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email", required: true })}
      </div>
      <div>
        <label htmlFor="b-message" className="field-label">
          Napomena <span className="font-semibold text-ink-soft">(neobavezno)</span>
        </label>
        <textarea id="b-message" name="message" rows={3} maxLength={2000} className="field" placeholder="Npr. željeno vrijeme, tema, posebne želje…" />
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="b-website">Web stranica</label>
        <input id="b-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 text-[0.95rem] text-ink">
        <input type="checkbox" name="privacy" className="mt-0.5 h-6 w-6 shrink-0 accent-navy" aria-invalid={!!errors.privacy} />
        <span>
          Pristajem na obradu podataka radi odgovora na upit (
          <Link href="/politika-privatnosti" className="font-bold text-navy underline">
            politika privatnosti
          </Link>
          ). <span className="text-coral-700">*</span>
        </span>
      </label>
      {errors.privacy && <p className="field-error -mt-2">{errors.privacy}</p>}
      <Turnstile onToken={setToken} />
      {message && (
        <p role="alert" className="rounded-2xl bg-coral-100 p-3 font-semibold text-coral-700">
          {message}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full sm:w-auto sm:justify-self-start">
        {state === "sending" ? "Šaljem…" : "Pošalji upit"} <Icon name="arrow-right" />
      </button>
    </form>
  );
}
