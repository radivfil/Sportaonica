import Link from "next/link";
import { notFound } from "next/navigation";
import { lookups } from "@/lib/admin-data";
import { WEEKDAYS } from "@/lib/format";
import { Checkbox, Flash, PageTitle, Select, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { saveSlot } from "../../../actions";

export const metadata = { title: "Termin" };

export default async function SlotEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { slotMap, activities, locations } = await lookups();
  const isNew = id === "novi";
  const slot = isNew ? undefined : slotMap.get(id);
  if (!isNew && !slot) notFound();

  return (
    <>
      <PageTitle title={isNew ? "Novi termin" : "Uredi termin"}>
        <Link href="/admin/termini" className="btn-ghost">← Svi termini</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveSlot} className="card grid max-w-3xl gap-5 p-5 sm:p-8">
        {slot && <input type="hidden" name="id" value={slot.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Aktivnost" name="activityId" defaultValue={slot?.activityId ?? ""} required>
            <option value="">— odaberite —</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}{a.status === "archived" ? " (arhivirano)" : ""}</option>)}
          </Select>
          <Select label="Lokacija" name="locationId" defaultValue={slot?.locationId ?? ""} required>
            <option value="">— odaberite —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Dan u tjednu" name="dayOfWeek" defaultValue={slot?.dayOfWeek ?? 1}>
            {Object.entries(WEEKDAYS).map(([n, label]) => <option key={n} value={n}>{label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Početak" name="startTime" type="time" defaultValue={slot?.startTime ?? "17:00"} required />
            <TextField label="Kraj" name="endTime" type="time" defaultValue={slot?.endTime ?? "18:00"} required />
          </div>
          <TextField label="Kapacitet (broj mjesta)" name="capacity" type="number" min={1} max={200} defaultValue={slot?.capacity ?? 12} required />
          <TextField label="Već upisani (izvan weba)" name="preEnrolled" type="number" min={0} max={200} defaultValue={slot?.preEnrolled ?? 0} hint="Postojeći članovi koji zauzimaju mjesto." />
          <TextField label="Napomena (neobavezno)" name="note" defaultValue={slot?.note} className="sm:col-span-2" />
        </div>
        <Checkbox label="Arhivirano (skriveno s web stranice)" name="archived" defaultChecked={slot?.status === "archived"} />
        {slot && (
          <p className="rounded-2xl bg-cream p-3 text-sm text-ink-soft">
            Trenutno: {slot.taken}/{slot.capacity} zauzeto, {slot.waitlistCount} na listi čekanja. Povećanjem kapaciteta djeca s liste čekanja automatski se upisuju.
          </p>
        )}
        <SubmitButton className="btn-primary justify-self-start">Spremi termin</SubmitButton>
      </form>
    </>
  );
}
