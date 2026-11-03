"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { MotionProvider } from "@/components/ui/MotionProvider";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { WEEKDAYS, seatsLabel } from "@/lib/format";
import { ageOn, isAgeInRange } from "@/lib/age";
import { SOURCES } from "@/lib/validation";
import { Icon } from "@/components/ui/Icon";
import { BallLoader } from "@/components/ui/BallLoader";
import { Turnstile } from "@/components/ui/Turnstile";
import { ActivityIcon, COLOR_CLASSES } from "@/components/home/ActivityIcon";
import { FillBar } from "./FillBar";
import { Confirmation, type BookingSuccess } from "./Confirmation";

type Props = {
  activities: Activity[];
  locations: Location[];
  slots: SlotWithStats[];
  initial: { activity?: string; location?: string; slot?: string };
};

type FormState = {
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childBirthDate: string;
  healthNote: string;
  source: string;
  gdprConsent: boolean;
  marketingConsent: boolean;
  website: string; // honeypot
};

const EMPTY: FormState = {
  parentName: "",
  phone: "",
  email: "",
  childName: "",
  childBirthDate: "",
  healthNote: "",
  source: "",
  gdprConsent: false,
  marketingConsent: false,
  website: "",
};

/** Animated expand/collapse of a step body (Framer Motion, honours reduced motion via MotionConfig). */
function StepBody({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
          exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

function StepHeader({ n, title, done, summary, onEdit }: { n: number; title: string; done: boolean; summary?: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold ${
          done ? "bg-teal-500 text-white" : "bg-navy text-white"
        }`}
      >
        {done ? <Icon name="check" className="h-5 w-5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-extrabold sm:text-2xl">
          <span className="sr-only">Korak {n}: </span>
          {title}
        </h2>
        {done && summary && <p className="truncate font-semibold text-ink-soft">{summary}</p>}
      </div>
      {done && onEdit && (
        <button type="button" onClick={onEdit} className="rounded-full px-3 py-2 text-sm font-bold text-navy underline underline-offset-2 hover:bg-sky-50">
          Promijeni
        </button>
      )}
    </div>
  );
}

export function BookingWizard({ activities, locations, slots: initialSlots, initial }: Props) {
  const initialSlot = initialSlots.find((s) => s.id === initial.slot);
  const [slots, setSlots] = useState(initialSlots);
  const [activityId, setActivityId] = useState<string | null>(
    initialSlot?.activityId ?? activities.find((a) => a.slug === initial.activity || a.id === initial.activity)?.id ?? null,
  );
  const [locationId, setLocationId] = useState<string | null>(
    initialSlot?.locationId ?? locations.find((l) => l.slug === initial.location || l.id === initial.location)?.id ?? null,
  );
  const [slotId, setSlotId] = useState<string | null>(initialSlot?.id ?? null);
  const [waitlist, setWaitlist] = useState(initialSlot?.isFull ?? false);
  const [editing, setEditing] = useState<1 | 2 | 3 | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; code?: string } | null>(null);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const startedAt = useRef<number>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    startedAt.current = Date.now();
    // refresh availability (page may have been cached by the browser)
    fetch("/api/slots", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh: Pick<SlotWithStats, "id" | "remaining" | "taken" | "capacity" | "isFull" | "waitlistCount">[] | null) => {
        if (!fresh) return;
        const map = new Map(fresh.map((f) => [f.id, f]));
        setSlots((prev) => prev.map((s) => ({ ...s, ...(map.get(s.id) ?? {}) })));
      })
      .catch(() => undefined);
  }, []);

  const activity = activities.find((a) => a.id === activityId) ?? null;
  const location = locations.find((l) => l.id === locationId) ?? null;
  const slot = slots.find((s) => s.id === slotId) ?? null;

  const activityLocations = useMemo(
    () => locations.filter((l) => slots.some((s) => s.activityId === activityId && s.locationId === l.id)),
    [locations, slots, activityId],
  );
  const availableSlots = useMemo(
    () => slots.filter((s) => s.activityId === activityId && s.locationId === locationId),
    [slots, activityId, locationId],
  );

  const step = editing ?? (!activity ? 1 : !location ? 2 : !slot ? 3 : 4);

  const focusStep = useCallback((i: number) => {
    requestAnimationFrame(() => {
      const el = stepRefs.current[i];
      if (!el) return;
      el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      el.focus({ preventScroll: true });
    });
  }, []);

  const chooseActivity = (id: string) => {
    setActivityId(id);
    const stillValid = slots.some((s) => s.activityId === id && s.locationId === locationId);
    if (!stillValid) setLocationId(null);
    setSlotId(null);
    setEditing(null);
    const locs = locations.filter((l) => slots.some((s) => s.activityId === id && s.locationId === l.id));
    if (locs.length === 1) setLocationId(locs[0].id);
    focusStep(stillValid || locs.length === 1 ? 2 : 1);
  };
  const chooseLocation = (id: string) => {
    setLocationId(id);
    setSlotId(null);
    setEditing(null);
    focusStep(2);
  };
  const chooseSlot = (id: string, asWaitlist: boolean) => {
    setSlotId(id);
    setWaitlist(asWaitlist);
    setEditing(null);
    setServerError(null);
    focusStep(3);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const ageWarning = useMemo(() => {
    if (!activity || !/^\d{4}-\d{2}-\d{2}$/.test(form.childBirthDate)) return null;
    if (isAgeInRange(form.childBirthDate, activity.ageMin, activity.ageMax)) return null;
    const age = ageOn(form.childBirthDate);
    return `Dijete ima ${age < 0 ? 0 : age} god., a program „${activity.name}” namijenjen je djeci od ${activity.ageMin} do ${activity.ageMax} godina.`;
  }, [form.childBirthDate, activity]);

  function validateClient(): Record<string, string> {
    const e: Record<string, string> = {};
    if (form.parentName.trim().length < 3) e.parentName = "Upišite ime i prezime roditelja.";
    if (!/^[+]?[\d\s/()-]{6,20}$/.test(form.phone.trim())) e.phone = "Upišite ispravan broj telefona.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Upišite ispravnu e-mail adresu.";
    if (form.childName.trim().length < 2) e.childName = "Upišite ime i prezime djeteta.";
    if (!form.childBirthDate) e.childBirthDate = "Upišite datum rođenja djeteta.";
    else if (ageWarning) e.childBirthDate = ageWarning;
    if (!form.gdprConsent) e.gdprConsent = "Za prijavu je potrebna privola za obradu podataka.";
    return e;
  }

  async function submit(e?: React.FormEvent, forceWaitlist = false) {
    e?.preventDefault();
    if (!slot) return;
    const clientErrors = validateClient();
    setErrors(clientErrors);
    setServerError(null);
    if (Object.keys(clientErrors).length) {
      const first = Object.keys(clientErrors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slotId: slot.id,
          waitlist: forceWaitlist || waitlist,
          startedAt: startedAt.current,
          turnstileToken,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSuccess({ ...json, activity: activity!, location: location!, slotData: slot });
        return;
      }
      if (json.fieldErrors) setErrors(json.fieldErrors);
      setServerError({ message: json.message ?? "Nešto je pošlo po zlu. Pokušajte ponovno.", code: json.code });
      if (json.code === "SLOT_FULL") {
        setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, remaining: 0, isFull: true, taken: s.capacity } : s)));
      }
    } catch {
      setServerError({ message: "Nema veze s poslužiteljem. Provjerite internet i pokušajte ponovno." });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <Confirmation data={success} />;

  const sectionCls = (active: boolean) =>
    `card min-w-0 scroll-mt-28 p-5 outline-none transition sm:p-7 ${active ? "ring-4 ring-teal-200" : "opacity-95"}`;

  return (
    <MotionProvider>
    <div className="grid gap-5">
      {/* STEP 1 — activity */}
      <section ref={(el) => { stepRefs.current[0] = el; }} tabIndex={-1} aria-labelledby="step1" className={sectionCls(step === 1)}>
        <div id="step1">
          <StepHeader n={1} title="Odaberite aktivnost" done={step !== 1 && !!activity} summary={activity && `${activity.name} · ${activity.ageMin}–${activity.ageMax} god.`} onEdit={() => setEditing(1)} />
        </div>
        <StepBody show={step === 1}>
          <div role="radiogroup" aria-label="Aktivnost" className="mt-5 grid gap-3 sm:grid-cols-2">
            {activities.map((a) => {
              const c = COLOR_CLASSES[a.color];
              const selected = a.id === activityId;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseActivity(a.id)}
                  className={`flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
                    selected ? "border-navy bg-sky-50" : `border-transparent ${c.soft}`
                  }`}
                >
                  <ActivityIcon icon={a.icon} color={a.color} className="h-16 w-16 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-extrabold leading-tight text-ink">{a.name}</span>
                    <span className="mt-1 inline-block rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-navy">
                      {a.ageMin}–{a.ageMax} godina
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </StepBody>
      </section>

      {/* STEP 2 — location */}
      <section ref={(el) => { stepRefs.current[1] = el; }} tabIndex={-1} aria-labelledby="step2" className={sectionCls(step === 2)}>
        <div id="step2">
          <StepHeader n={2} title="Odaberite lokaciju" done={step > 2 && !!location} summary={location?.name} onEdit={() => setEditing(2)} />
        </div>
        <StepBody show={step === 2 && !!activity}>
          <div role="radiogroup" aria-label="Lokacija" className="mt-5 grid gap-3 sm:grid-cols-3">
            {activityLocations.map((l) => {
              const own = slots.filter((s) => s.activityId === activityId && s.locationId === l.id);
              const free = own.reduce((n, s) => n + s.remaining, 0);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={l.id === locationId}
                  onClick={() => chooseLocation(l.id)}
                  className={`rounded-3xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
                    l.id === locationId ? "border-navy bg-sky-50" : "border-ink/10 bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                    <Icon name="pin" className="h-5 w-5 text-coral" /> {l.name}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-ink-soft">
                    {own.length} {own.length === 1 ? "termin" : "termina"} · {free > 0 ? `${free} slobodnih mjesta` : "lista čekanja"}
                  </span>
                </button>
              );
            })}
            {activityLocations.length === 0 && <p className="text-ink-soft">Za ovu aktivnost trenutno nema objavljenih termina.</p>}
          </div>
        </StepBody>
      </section>

      {/* STEP 3 — slot */}
      <section id="termini" ref={(el) => { stepRefs.current[2] = el; }} tabIndex={-1} aria-labelledby="step3" className={sectionCls(step === 3)}>
        <div id="step3">
          <StepHeader
            n={3}
            title="Odaberite termin"
            done={step > 3 && !!slot}
            summary={slot && `${WEEKDAYS[slot.dayOfWeek]}, ${slot.startTime}–${slot.endTime}${waitlist ? " · lista čekanja" : ""}`}
            onEdit={() => setEditing(3)}
          />
        </div>
        <StepBody show={step === 3 && !!activity && !!location}>
          <ul className="mt-5 grid gap-3">
            {availableSlots.map((s) => (
              <li key={s.id} className={`rounded-3xl border-2 p-4 sm:p-5 ${s.id === slotId ? "border-navy bg-sky-50" : "border-ink/10 bg-white"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-extrabold text-ink">
                      {WEEKDAYS[s.dayOfWeek]} <span className="text-ink-soft">·</span> {s.startTime}–{s.endTime}
                    </p>
                    <p className={`mt-0.5 font-bold ${s.isFull ? "text-coral-700" : s.remaining <= 3 ? "text-ink" : "text-teal-700"}`}>
                      {seatsLabel(s.remaining)}
                      {s.isFull && s.waitlistCount > 0 && <span className="font-semibold text-ink-soft"> · na listi čekanja: {s.waitlistCount}</span>}
                    </p>
                  </div>
                  {s.isFull ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="btn !min-h-[44px] cursor-default bg-ink/10 !px-4 text-ink-soft" aria-hidden="true">
                        Popunjeno
                      </span>
                      <button type="button" onClick={() => chooseSlot(s.id, true)} className="btn-secondary !min-h-[44px] !px-4">
                        Upis na listu čekanja
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => chooseSlot(s.id, false)} className="btn-primary !min-h-[48px] !px-5" aria-label={`Odaberi termin ${WEEKDAYS[s.dayOfWeek]} ${s.startTime}`}>
                      Odaberi <Icon name="arrow-right" />
                    </button>
                  )}
                </div>
                <FillBar taken={s.taken} capacity={s.capacity} className="mt-3" />
              </li>
            ))}
          </ul>
        </StepBody>
      </section>

      {/* STEP 4 — form */}
      <section id="prijava" ref={(el) => { stepRefs.current[3] = el; }} tabIndex={-1} aria-labelledby="step4" className={sectionCls(step === 4)}>
        <div id="step4">
          <StepHeader n={4} title={waitlist ? "Podaci za listu čekanja" : "Podaci za prijavu"} done={false} />
        </div>
        {step === 4 && slot && activity && (
          <form ref={formRef} onSubmit={submit} noValidate className="mt-6 grid gap-5">
            {waitlist && (
              <p className="flex gap-3 rounded-2xl bg-butter-100 p-4 font-semibold text-ink">
                <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
                Termin je popunjen. Upisom na listu čekanja dobit ćete mjesto automatski čim se oslobodi — javit ćemo vam e-mailom.
              </p>
            )}

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-display text-lg font-extrabold text-ink">Roditelj / skrbnik</legend>
              <Field label="Ime i prezime" name="parentName" value={form.parentName} onChange={(v) => set("parentName", v)} error={errors.parentName} autoComplete="name" className="sm:col-span-2" />
              <Field label="Mobitel" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" placeholder="09x xxx xxxx" />
              <Field label="E-mail" name="email" type="email" inputMode="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" hint="Na ovu adresu šaljemo potvrdu." />
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-display text-lg font-extrabold text-ink">Dijete</legend>
              <Field label="Ime i prezime djeteta" name="childName" value={form.childName} onChange={(v) => set("childName", v)} error={errors.childName} autoComplete="off" />
              <Field
                label="Datum rođenja"
                name="childBirthDate"
                type="date"
                value={form.childBirthDate}
                onChange={(v) => set("childBirthDate", v)}
                error={errors.childBirthDate || (ageWarning ?? undefined)}
                hint={`Program je za dob ${activity.ageMin}–${activity.ageMax} god.`}
                max={new Date().toISOString().slice(0, 10)}
              />
              <div className="sm:col-span-2">
                <label htmlFor="healthNote" className="field-label">
                  Napomena o zdravlju ili alergijama <span className="font-semibold text-ink-soft">(neobavezno)</span>
                </label>
                <textarea id="healthNote" name="healthNote" rows={3} maxLength={600} value={form.healthNote} onChange={(e) => set("healthNote", e.target.value)} className="field" placeholder="Npr. astma, alergija na…" />
                <p className="mt-1 text-sm text-ink-soft">Navedite samo ono što trener treba znati radi sigurnosti djeteta.</p>
              </div>
            </fieldset>

            <div>
              <label htmlFor="source" className="field-label">
                Kako ste čuli za nas? <span className="font-semibold text-ink-soft">(neobavezno)</span>
              </label>
              <select id="source" name="source" value={form.source} onChange={(e) => set("source", e.target.value)} className="field">
                <option value="">— odaberite —</option>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* honeypot — hidden from humans */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="website">Web stranica</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>

            <div className="grid gap-3 rounded-3xl bg-pink-50 p-4 sm:p-5">
              <Check
                name="gdprConsent"
                checked={form.gdprConsent}
                onChange={(v) => set("gdprConsent", v)}
                error={errors.gdprConsent}
                label={
                  <>
                    Kao roditelj/skrbnik pristajem na obradu osobnih podataka mene i mog djeteta u svrhu provedbe programa, sukladno{" "}
                    <Link href="/politika-privatnosti" target="_blank" className="font-bold text-navy underline">
                      Politici privatnosti
                    </Link>
                    . <span className="text-coral-700">*</span>
                  </>
                }
              />
              <Check
                name="marketingConsent"
                checked={form.marketingConsent}
                onChange={(v) => set("marketingConsent", v)}
                label="Želim povremeno primati obavijesti o novim programima i upisima e-mailom (neobavezno, možete se odjaviti u bilo kojem trenutku)."
              />
            </div>

            <Turnstile onToken={setTurnstileToken} />

            {serverError && (
              <div role="alert" className="rounded-2xl border-2 border-coral bg-coral-100 p-4 font-semibold text-coral-700">
                <p>{serverError.message}</p>
                {serverError.code === "SLOT_FULL" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-navy !min-h-[44px]" onClick={() => { setWaitlist(true); submit(undefined, true); }}>
                      Upiši na listu čekanja
                    </button>
                    <button type="button" className="btn-secondary !min-h-[44px]" onClick={() => setEditing(3)}>
                      Odaberi drugi termin
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-soft">
                <span className="text-coral-700">*</span> Online plaćanje nije potrebno.
              </p>
              <button type="submit" disabled={submitting} className="btn-primary !min-h-[56px] !px-8 !text-lg">
                {submitting ? "Šaljem…" : waitlist ? "Upiši na listu čekanja" : "Pošalji prijavu"}
                {!submitting && <Icon name="arrow-right" />}
              </button>
            </div>
            {submitting && <BallLoader label="Rezerviramo mjesto…" className="py-2" />}
          </form>
        )}
      </section>
    </div>
    </MotionProvider>
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
    <div className={className}>
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

function Check({ name, checked, onChange, label, error }: { name: string; checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-relaxed text-ink">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-0.5 h-6 w-6 shrink-0 rounded-md accent-navy"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${name}-error`} className="field-error ml-9">
          {error}
        </p>
      )}
    </div>
  );
}
