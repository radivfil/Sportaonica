"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Turnstile } from "@/components/ui/Turnstile";
import { STATIC_DEMO } from "@/lib/site";

export function ContactForm({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string>();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

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
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        message: fd.get("message"),
        privacy: fd.get("privacy") === "on",
        website: fd.get("website"),
        startedAt: startedAt.current,
        turnstileToken: token,
      }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.ok) {
      setState("sent");
      return;
    }
    setState("idle");
    setErrors(json?.fieldErrors ?? {});
    setMessage(json?.message ?? "Poruka nije poslana. Pokušajte ponovno ili nas nazovite.");
  }

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center p-8 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-200">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <H className="mt-4 text-2xl font-extrabold">Hvala na poruci!</H>
        <p className="mt-2 text-ink-soft">Javit ćemo vam se u najkraćem mogućem roku.</p>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, optional = false) => (
    <div>
      <label htmlFor={`c-${name}`} className="field-label">
        {label} {optional && <span className="font-semibold text-ink-soft">(neobavezno)</span>}
      </label>
      <input id={`c-${name}`} name={name} className="field" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `c-${name}-err` : undefined} {...props} />
      {errors[name] && (
        <p id={`c-${name}-err`} className="field-error">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="card grid gap-4 p-6 sm:p-8">
      <H className="text-2xl font-extrabold">Pošaljite nam poruku</H>
      {field("name", "Ime i prezime", { autoComplete: "name", required: true })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email", required: true })}
        {field("phone", "Telefon", { type: "tel", autoComplete: "tel", inputMode: "tel" }, true)}
      </div>
      <div>
        <label htmlFor="c-message" className="field-label">Poruka</label>
        <textarea id="c-message" name="message" rows={5} required className="field" aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-message-err" : undefined} />
        {errors.message && <p id="c-message-err" className="field-error">{errors.message}</p>}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Web stranica</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 text-[0.95rem] text-ink">
        <input type="checkbox" name="privacy" className="mt-0.5 h-6 w-6 shrink-0 accent-navy" aria-invalid={!!errors.privacy} />
        <span>
          Pristajem na obradu podataka radi odgovora na upit (
          <Link href="/politika-privatnosti" className="font-bold text-navy underline">politika privatnosti</Link>).
        </span>
      </label>
      {errors.privacy && <p className="field-error -mt-2">{errors.privacy}</p>}
      <Turnstile onToken={setToken} />
      {message && (
        <p role="alert" className="rounded-2xl bg-coral-100 p-3 font-semibold text-coral-700">
          {message}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="btn-primary justify-self-start">
        {state === "sending" ? "Šaljem…" : "Pošalji poruku"} <Icon name="arrow-right" />
      </button>
    </form>
  );
}
