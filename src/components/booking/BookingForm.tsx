"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { ageRangeLabel, ageYears, isAgeAllowed } from "@/lib/data/rules";
import { WEEKDAYS, formatYmd, plural, seatsLabel } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { BallLoader } from "@/components/ui/BallLoader";
import { Turnstile } from "@/components/ui/Turnstile";
import { ActivityIcon } from "@/components/home/ActivityIcon";
import { Confirmation, type BookingSuccess } from "./Confirmation";
import { STATIC_DEMO } from "@/lib/site";

type Props = {
  activity: Activity;
  location: Location;
  slot: SlotWithStats;
  /** remaining sessions of the same series (incl. `slot`), empty for weekly groups */
  series: SlotWithStats[];
  initialSeries: boolean;
  initialWaitlist: boolean;
};

type FormState = {
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childBirthDate: string;
  healthNote: string;
  gdprConsent: boolean;
  website: string; // honeypot
};

const EMPTY: FormState = { parentName: "", phone: "", email: "", childName: "", childBirthDate: "", healthNote: "", gdprConsent: false, website: "" };

const when = (s: SlotWithStats) =>
  s.kind === "single" && s.date ? `${WEEKDAYS[s.dayOfWeek]}, ${formatYmd(s.date)}, ${s.startTime}–${s.endTime}` : `${WEEKDAYS[s.dayOfWeek]}, ${s.startTime}–${s.endTime}, svaki tjedan`;

export function BookingForm({ activity, location, slot, series, initialSeries, initialWaitlist }: Props) {
  const adult = activity.audience === "adults";
  const [wholeSeries, setWholeSeries] = useState(initialSeries && series.length > 1);
  const [live, setLive] = useState<Map<string, { remaining: number; isFull: boolean }>>(new Map());
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; code?: string } | null>(null);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  const chosen = wholeSeries ? series : [slot];
  const remainingOf = (s: SlotWithStats) => live.get(s.id)?.remaining ?? s.remaining;
  const anyFull = chosen.some((s) => remainingOf(s) === 0);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const needsWaitlist = anyFull || waitlist;

  useEffect(() => {
    startedAt.current = Date.now();
    if (STATIC_DEMO) return; // no API on a static host
    // refresh availability (the page may come from the browser cache)
    fetch("/api/slots", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh: { id: string; remaining: number; isFull: boolean }[] | null) => fresh && setLive(new Map(fresh.map((f) => [f.id, f]))))
      .catch(() => undefined);
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const ageWarning = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.childBirthDate)) return null;
    if (isAgeAllowed(activity, form.childBirthDate)) return null;
    const age = Math.max(0, ageYears(form.childBirthDate));
    return `${adult ? "Polaznik ima" : "Dijete ima"} ${age} ${plural(age, "godinu", "godine", "godina")}, a program „${activity.name}” namijenjen je dobi: ${ageRangeLabel(activity)}.`;
  }, [form.childBirthDate, activity, adult]);

  function validateClient(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!adult && form.parentName.trim().length < 3) e.parentName = "Upišite ime i prezime roditelja.";
    if (!/^[+]?[\d\s/()-]{6,20}$/.test(form.phone.trim())) e.phone = "Upišite ispravan broj telefona.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Upišite ispravnu e-mail adresu.";
    if (form.childName.trim().length < 3) e.childName = adult ? "Upišite ime i prezime." : "Upišite ime i prezime djeteta.";
    if (!form.childBirthDate) e.childBirthDate = "Upišite datum rođenja.";
    else if (ageWarning) e.childBirthDate = ageWarning;
    if (!form.gdprConsent) e.gdprConsent = "Za prijavu je potrebna privola za obradu podataka.";
    return e;
  }

  async function submit(e?: React.FormEvent, forceWaitlist = false) {
    e?.preventDefault();
    const clientErrors = validateClient();
    setErrors(clientErrors);
    setServerError(null);
    if (Object.keys(clientErrors).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(clientErrors)[0]}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    if (STATIC_DEMO) {
      // static design preview: simulate the server, nothing is stored or sent
      await new Promise((r) => setTimeout(r, 900));
      setSuccess({
        ok: true,
        sessions: chosen.map((s) => ({
          slotId: s.id,
          activityName: activity.name,
          locationName: location.name,
          when: when(s),
          status: remainingOf(s) === 0 ? "waitlist" : "active",
          waitlistPosition: remainingOf(s) === 0 ? s.waitlistCount + 1 : null,
        })),
        childName: form.childName,
        email: form.email,
        activity,
        location,
        adult,
        staticPreview: true,
      });
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIds: chosen.map((s) => s.id),
          parentName: adult ? form.childName : form.parentName,
          phone: form.phone,
          email: form.email,
          childName: form.childName,
          childBirthDate: form.childBirthDate,
          healthNote: form.healthNote,
          gdprConsent: form.gdprConsent,
          waitlist: forceWaitlist || needsWaitlist,
          website: form.website,
          startedAt: startedAt.current,
          turnstileToken,
        }),
      });
      const json = await res.json();
      if (json.ok && json.sessions) {
        setSuccess({ ...json, activity, location, adult });
        return;
      }
      if (json.ok && json.spam) return;
      if (json.fieldErrors) setErrors(json.fieldErrors);
      setServerError({ message: json.message ?? "Nešto je pošlo po zlu. Pokušajte ponovno.", code: json.code });
      if (json.code === "SLOT_FULL") setWaitlist(true);
    } catch {
      setServerError({ message: "Nema veze s poslužiteljem. Provjerite internet i pokušajte ponovno." });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <Confirmation data={success} />;

  return (
    <div className="grid gap-5">
      {/* chosen session */}
      <section aria-labelledby="odabrano" className="card min-w-0 p-5 sm:p-7">
        <div className="flex flex-wrap items-start gap-4">
          <ActivityIcon icon={activity.icon} color={activity.color} className="h-16 w-16 shrink-0" />
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft" id="odabrano">Odabrali ste</p>
            <h2 className="text-2xl font-extrabold [overflow-wrap:anywhere]">{activity.name}</h2>
            <p className="mt-1 font-semibold text-ink-soft">
              {ageRangeLabel(activity)} · {location.name}
              {location.address ? `, ${location.address}` : ""}
            </p>
          </div>
          <Link href={`/aktivnosti#${activity.slug}`} className="btn-ghost !min-h-[44px] shrink-0 whitespace-nowrap">
            Promijeni termin
          </Link>
        </div>

        {series.length > 1 ? (
          <fieldset className="mt-5 grid gap-2.5">
            <legend className="mb-1 font-bold text-ink">Na što se prijavljujete?</legend>
            <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl bg-cream p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-navy">
              <input type="radio" name="opseg" checked={!wholeSeries} onChange={() => setWholeSeries(false)} className="h-5 w-5 accent-navy" />
              <span className="min-w-0 flex-1 font-bold">Samo ovaj termin: {when(slot)}</span>
              <span className="text-sm font-extrabold text-ink-soft">{seatsLabel(remainingOf(slot))}</span>
            </label>
            <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl bg-cream p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-navy">
              <input type="radio" name="opseg" checked={wholeSeries} onChange={() => setWholeSeries(true)} className="h-5 w-5 accent-navy" />
              <span className="min-w-0 flex-1 font-bold">
                Cijela serija: {series.length} {plural(series.length, "termin", "termina", "termina")} ({series.map((s) => formatYmd(s.date!).slice(0, -6)).join(", ")})
              </span>
            </label>
          </fieldset>
        ) : (
          <p className="mt-5 rounded-2xl bg-cream p-3.5 font-bold">
            {when(slot)} · <span className={remainingOf(slot) === 0 ? "text-coral-700" : "text-teal-700"}>{seatsLabel(remainingOf(slot))}</span>
          </p>
        )}
      </section>

      <section aria-labelledby="podaci" className="card min-w-0 p-5 sm:p-7">
        <h2 id="podaci" className="text-2xl font-extrabold">{needsWaitlist ? "Podaci za listu čekanja" : "Podaci za prijavu"}</h2>
        <form ref={formRef} onSubmit={submit} noValidate className="mt-5 grid gap-5">
          {needsWaitlist && (
            <p className="flex gap-3 rounded-2xl bg-butter-100 p-4 font-semibold text-ink">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
              {anyFull ? "Termin je popunjen." : "Upisujete se na listu čekanja."} Čim se mjesto oslobodi, automatski dobivate mjesto i javljamo vam e-mailom.
            </p>
          )}

          {!adult && (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-display text-lg font-extrabold text-ink">Roditelj / skrbnik</legend>
              <Field label="Ime i prezime roditelja" name="parentName" value={form.parentName} onChange={(v) => set("parentName", v)} error={errors.parentName} autoComplete="name" className="sm:col-span-2" />
              <Field label="Mobitel" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" placeholder="09x xxx xxxx" />
              <Field label="E-mail" name="email" type="email" inputMode="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" hint="Na ovu adresu šaljemo potvrdu." />
            </fieldset>
          )}

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-display text-lg font-extrabold text-ink">{adult ? "Vaši podaci" : activity.withParent ? "Dijete (dolazi uz roditelja)" : "Dijete"}</legend>
            <Field label={adult ? "Ime i prezime" : "Ime i prezime djeteta"} name="childName" value={form.childName} onChange={(v) => set("childName", v)} error={errors.childName} autoComplete={adult ? "name" : "off"} />
            <Field
              label="Datum rođenja"
              name="childBirthDate"
              type="date"
              value={form.childBirthDate}
              onChange={(v) => set("childBirthDate", v)}
              error={errors.childBirthDate || (ageWarning ?? undefined)}
              hint={`Program je za dob: ${ageRangeLabel(activity)}.`}
              max={new Date().toISOString().slice(0, 10)}
            />
            {adult && (
              <>
                <Field label="Mobitel" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" placeholder="09x xxx xxxx" />
                <Field label="E-mail" name="email" type="email" inputMode="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" hint="Na ovu adresu šaljemo potvrdu." />
              </>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="healthNote" className="field-label">
                Napomena o zdravlju ili alergijama <span className="font-semibold text-ink-soft">(neobavezno)</span>
              </label>
              <textarea id="healthNote" name="healthNote" rows={3} maxLength={600} value={form.healthNote} onChange={(e) => set("healthNote", e.target.value)} className="field" />
              <p className="mt-1 text-sm text-ink-soft">Navedite samo ono što trener treba znati radi sigurnosti.</p>
            </div>
          </fieldset>

          {/* honeypot: hidden from humans */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Web stranica</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>

          <div className="rounded-3xl bg-pink-50 p-4 sm:p-5">
            <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-relaxed text-ink">
              <input
                type="checkbox"
                name="gdprConsent"
                checked={form.gdprConsent}
                onChange={(e) => set("gdprConsent", e.target.checked)}
                aria-invalid={!!errors.gdprConsent}
                aria-describedby={errors.gdprConsent ? "gdprConsent-error" : undefined}
                className="mt-0.5 h-6 w-6 shrink-0 rounded-md accent-navy"
              />
              <span>
                {adult ? "Pristajem" : "Kao roditelj/skrbnik pristajem"} na obradu navedenih osobnih podataka u svrhu provedbe programa, sukladno{" "}
                <Link href="/politika-privatnosti" target="_blank" className="font-bold text-navy underline">
                  Politici privatnosti
                </Link>
                . <span className="text-coral-700">*</span>
              </span>
            </label>
            {errors.gdprConsent && (
              <p id="gdprConsent-error" className="field-error ml-9">
                {errors.gdprConsent}
              </p>
            )}
          </div>

          <Turnstile onToken={setTurnstileToken} />

          {serverError && (
            <div role="alert" className="rounded-2xl border-2 border-coral bg-coral-100 p-4 font-semibold text-coral-700">
              <p>{serverError.message}</p>
              {serverError.code === "SLOT_FULL" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-navy !min-h-[48px]" onClick={() => submit(undefined, true)}>
                    Upiši na listu čekanja
                  </button>
                  <Link href={`/aktivnosti#${activity.slug}`} className="btn-secondary !min-h-[48px]">
                    Odaberi drugi termin
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              <span className="text-coral-700">*</span> obavezno · Bez korisničkog računa i bez online plaćanja.
            </p>
            <button type="submit" disabled={submitting} className="btn-primary !min-h-[56px] w-full !px-8 !text-lg sm:w-auto">
              {submitting ? "Šaljem…" : needsWaitlist ? "Upiši na listu čekanja" : "Pošalji prijavu"}
              {!submitting && <Icon name="arrow-right" />}
            </button>
          </div>
          {submitting && <BallLoader label="Rezerviramo mjesto…" className="py-2" />}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  className = "",
  ...rest
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "name">) {
  const errId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={name} className="field-label">
        {label} <span className="text-coral-700" aria-hidden="true">*</span>
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-required="true"
        aria-describedby={[error ? errId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined}
        className="field"
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
