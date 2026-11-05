import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { WEEKDAYS } from "@/lib/format";
import { Flash, PageTitle, Select, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { generateSlots } from "../../../actions";
import { zagrebDate } from "@/lib/data/rules";

export const metadata = { title: "Generiraj termine" };

export default async function SlotGenerator({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { activities, locations } = await lookups(await adminRepo());
  const today = zagrebDate();
  return (
    <>
      <PageTitle title="Generiraj termine za razdoblje" intro="Odaberite aktivnost, lokaciju, dane i razdoblje. Sustav napravi sve termine odjednom.">
        <Link href="/admin/termini" className="btn-ghost">← Svi termini</Link>
      </PageTitle>
      <Flash error={sp.error} />
      <form action={generateSlots} className="card grid max-w-3xl gap-5 p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Aktivnost" name="activityId" required defaultValue="">
            <option value="">Odaberite</option>
            {activities.filter((a) => a.status === "active").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="Lokacija" name="locationId" required defaultValue="">
            <option value="">Odaberite</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
        <fieldset className="grid gap-3">
          <legend className="field-label">Vrsta</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
            <input type="radio" name="kind" value="weekly" defaultChecked className="mt-1 h-5 w-5 accent-navy" />
            <span>
              <span className="font-bold">Tjedne grupe za sezonu</span>
              <span className="block text-sm text-ink-soft">Po jedna grupa za svaki odabrani dan. Roditelj upisuje dijete za cijelu sezonu (npr. dječji programi).</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
            <input type="radio" name="kind" value="single" className="mt-1 h-5 w-5 accent-navy" />
            <span>
              <span className="font-bold">Serija pojedinačnih termina</span>
              <span className="block text-sm text-ink-soft">Jedan termin za svaki datum u razdoblju. Roditelj bira pojedini termin ili cijelu seriju (npr. škola rolanja, radionice, odrasli).</span>
            </span>
          </label>
        </fieldset>
        <fieldset>
          <legend className="field-label">Dani u tjednu</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WEEKDAYS).map(([n, label]) => (
              <label key={n} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-white px-4 font-bold ring-1 ring-ink/15 has-[:checked]:bg-navy has-[:checked]:text-white">
                <input type="checkbox" name="days" value={n} className="h-4 w-4 accent-navy" /> {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Od datuma" name="from" type="date" defaultValue={today} required />
          <TextField label="Do datuma" name="to" type="date" required />
          <TextField label="Početak" name="startTime" type="time" defaultValue="17:00" required />
          <TextField label="Kraj" name="endTime" type="time" defaultValue="17:45" required />
          <TextField label="Kapacitet po terminu" name="capacity" type="number" min={1} max={500} defaultValue={12} required />
        </div>
        <SubmitButton className="btn-primary justify-self-start" pendingLabel="Generiram…">Generiraj termine</SubmitButton>
      </form>
    </>
  );
}
