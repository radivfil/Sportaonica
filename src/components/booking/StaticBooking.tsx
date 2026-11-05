"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Activity, Location, SlotWithStats } from "@/lib/data/types";
import { remainingSeries } from "@/lib/data/rules";
import { BookingForm } from "./BookingForm";

/**
 * Static preview only (GitHub Pages has no server to read ?termin=…):
 * picks the session from the URL in the browser. Without ?termin shows `children` (the timetable).
 */
export function StaticBooking({
  activities,
  locations,
  slots,
  aside,
  hero,
  children,
}: {
  activities: Activity[];
  locations: Location[];
  slots: SlotWithStats[];
  aside: React.ReactNode;
  hero: React.ReactNode;
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
  // the crawled HTML contains the timetable; switch to the form only after hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const slot = slots.find((s) => s.id === sp.get("termin"));
  const activity = slot && activities.find((a) => a.id === slot.activityId);
  const location = slot && locations.find((l) => l.id === slot.locationId);
  if (!mounted || !slot || !activity || !location) return <>{children}</>;
  return (
    <>
    {hero}
    <div className="container grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start [&>*]:min-w-0">
      <BookingForm
        key={slot.id}
        activity={activity}
        location={location}
        slot={slot}
        series={slot.seriesId ? remainingSeries(slots, slot.seriesId) : []}
        initialSeries={sp.get("serija") === "1"}
        initialWaitlist={sp.get("cekanje") === "1" || slot.isFull}
      />
      {aside}
    </div>
    </>
  );
}
