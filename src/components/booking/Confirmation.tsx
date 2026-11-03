"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import type { SlotDescription } from "@/lib/email/templates";
import { Icon } from "@/components/ui/Icon";
import { Star, Sparkle, BeachBall } from "@/components/ui/Doodles";

export type BookingSuccess = {
  ok: true;
  registration: { id: string; status: "confirmed" | "waitlist"; childName: string; email: string };
  slot: SlotDescription;
  waitlistPosition: number | null;
  demoCancelUrl?: string;
  activity: Activity;
  location: Location;
  slotData: SlotWithStats;
};

/** Weekly-recurring .ics event, generated in the browser. */
function icsHref(d: BookingSuccess) {
  const s = d.slotData;
  const now = new Date();
  const diff = (s.dayOfWeek - (((now.getDay() + 6) % 7) + 1) + 7) % 7;
  const first = new Date(now);
  first.setDate(now.getDate() + diff);
  const ymd = `${first.getFullYear()}${String(first.getMonth() + 1).padStart(2, "0")}${String(first.getDate()).padStart(2, "0")}`;
  const t = (hm: string) => `${hm.replace(":", "")}00`;
  const byday = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][s.dayOfWeek - 1];
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sportaonica//HR",
    "BEGIN:VEVENT",
    `UID:${d.registration.id}@sportaonica`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Zagreb:${ymd}T${t(s.startTime)}`,
    `DTEND;TZID=Europe/Zagreb:${ymd}T${t(s.endTime)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    `SUMMARY:Sportaonica — ${d.activity.name}`,
    `LOCATION:${d.location.venue}\\, ${d.location.address}\\, ${d.location.city}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function Confirmation({ data }: { data: BookingSuccess }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    h.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  const waitlist = data.registration.status === "waitlist";

  return (
    <div className="card relative overflow-hidden p-6 text-center sm:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Star className="absolute left-5 top-5 w-10 animate-wiggle" />
        <Sparkle className="absolute right-8 top-10 w-8 animate-float" fill="#F2ACA4" />
        <BeachBall className="absolute bottom-5 right-5 w-12 animate-float-slow" />
      </div>
      <div className={`mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full ${waitlist ? "bg-butter-200" : "bg-teal-200"}`}>
        <Icon name={waitlist ? "clock" : "check"} className="h-10 w-10 text-ink" />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-extrabold outline-none sm:text-4xl" data-testid="confirmation-title">
        {waitlist ? "Na listi ste čekanja!" : "Prijava je zaprimljena!"}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-lg text-ink-soft" role="status">
        {waitlist ? (
          <>
            <strong className="text-ink">{data.registration.childName}</strong> je na listi čekanja
            {data.waitlistPosition ? (
              <>
                {" "}
                (redni broj <strong className="text-ink">{data.waitlistPosition}</strong>)
              </>
            ) : null}
            . Čim se mjesto oslobodi, automatski vas upisujemo i javljamo e-mailom.
          </>
        ) : (
          <>
            <strong className="text-ink">{data.registration.childName}</strong> ima rezervirano mjesto. Potvrdu smo poslali na{" "}
            <strong className="break-words text-ink">{data.registration.email}</strong>.
          </>
        )}
      </p>

      <dl className="relative mx-auto mt-8 grid max-w-md gap-2.5 rounded-3xl bg-teal-50 p-5 text-left">
        {[
          ["Aktivnost", data.slot.activityName],
          ["Lokacija", `${data.slot.locationName}`],
          ["Termin", `${data.slot.day}, ${data.slot.time}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="font-semibold text-ink-soft">{k}</dt>
            <dd className="text-right font-extrabold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {!waitlist && (
          <a href={icsHref(data)} download="sportaonica-trening.ics" className="btn-navy">
            <Icon name="calendar" /> Dodaj u kalendar
          </a>
        )}
        <Link href="/cesta-pitanja" className="btn-secondary">
          Što ponijeti na trening?
        </Link>
      </div>

      {data.demoCancelUrl && (
        <p className="relative mx-auto mt-8 max-w-lg rounded-2xl border-2 border-dashed border-ink/20 bg-white p-4 text-sm text-ink-soft">
          <strong className="text-ink">Demo način:</strong> e-mailovi se ispisuju u konzolu poslužitelja. Osobna poveznica za otkazivanje:{" "}
          <a href={data.demoCancelUrl} className="break-all font-bold text-navy underline" data-testid="demo-cancel-link">
            {data.demoCancelUrl}
          </a>
        </p>
      )}
    </div>
  );
}
