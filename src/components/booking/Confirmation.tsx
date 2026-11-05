"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Activity, Location } from "@/lib/data/types";
import type { BookedSession } from "@/lib/booking";
import { Icon } from "@/components/ui/Icon";
import { Star, Sparkle, BeachBall } from "@/components/ui/Doodles";

export type BookingSuccess = {
  ok: true;
  sessions: BookedSession[];
  childName: string;
  email: string;
  demoCancelUrl?: string;
  activity: Activity;
  location: Location;
  adult: boolean;
  staticPreview?: boolean;
};

export function Confirmation({ data }: { data: BookingSuccess }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    h.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  const allWait = data.sessions.every((s) => s.status === "waitlist");
  const someWait = data.sessions.some((s) => s.status === "waitlist");

  return (
    <div className="card relative overflow-hidden p-6 text-center sm:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Star className="absolute left-5 top-5 w-10 animate-wiggle" />
        <Sparkle className="absolute right-8 top-10 w-8 animate-float" fill="#F2ACA4" />
        <BeachBall className="absolute bottom-5 right-5 w-12 animate-float-slow" />
      </div>
      <div className={`mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full ${allWait ? "bg-butter-200" : "bg-teal-200"}`}>
        <Icon name={allWait ? "clock" : "check"} className="h-10 w-10 text-ink" />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-extrabold outline-none sm:text-4xl" data-testid="confirmation-title">
        {allWait ? "Na listi ste čekanja!" : "Prijava je zaprimljena!"}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-lg text-ink-soft" role="status">
        <strong className="text-ink">{data.childName}</strong>{" "}
        {allWait ? "je na listi čekanja. Čim se mjesto oslobodi, automatski dobivate mjesto i javljamo vam e-mailom." : "ima rezervirano mjesto."} Potvrdu s osobnom poveznicom za otkazivanje poslali smo na{" "}
        <strong className="break-words text-ink">{data.email}</strong>.
      </p>

      <ul className="relative mx-auto mt-8 grid max-w-lg gap-2 text-left">
        {data.sessions.map((s) => (
          <li key={s.slotId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50 p-4">
            <span className="min-w-0">
              <span className="block font-extrabold text-ink">{s.activityName}</span>
              <span className="block text-sm font-semibold text-ink-soft">
                {s.when} · {s.locationName}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-extrabold ${s.status === "waitlist" ? "bg-butter-200 text-ink" : "bg-teal-200 text-ink"}`}>
              {s.status === "waitlist" ? `Lista čekanja${s.waitlistPosition ? ` (${s.waitlistPosition}.)` : ""}` : "Upisano"}
            </span>
          </li>
        ))}
      </ul>
      {someWait && !allWait && <p className="relative mx-auto mt-3 max-w-lg text-sm text-ink-soft">Za termine na listi čekanja javit ćemo vam se e-mailom čim se mjesto oslobodi.</p>}

      <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/cesta-pitanja" className="btn-secondary">
          Što ponijeti?
        </Link>
        <Link href="/aktivnosti" className="btn-ghost">
          Pogledaj druge programe
        </Link>
      </div>

      {data.staticPreview && (
        <p className="relative mx-auto mt-8 max-w-lg rounded-2xl border-2 border-dashed border-ink/20 bg-white p-4 text-sm text-ink-soft">
          <strong className="text-ink">Pregled dizajna:</strong> ovo je statična verzija stranice. Prijava nije spremljena i e-mail nije poslan. U punoj
          verziji roditelj odmah dobiva potvrdu s osobnom poveznicom za otkazivanje, a vlasnica obavijest.
        </p>
      )}
      {data.demoCancelUrl && (
        <p className="relative mx-auto mt-8 max-w-lg rounded-2xl border-2 border-dashed border-ink/20 bg-white p-4 text-sm text-ink-soft">
          <strong className="text-ink">DEMO:</strong> e-mailovi se ispisuju u konzolu poslužitelja. Osobna poveznica za otkazivanje:{" "}
          <a href={data.demoCancelUrl} className="break-all font-bold text-navy underline" data-testid="demo-cancel-link">
            {data.demoCancelUrl}
          </a>
        </p>
      )}
    </div>
  );
}
