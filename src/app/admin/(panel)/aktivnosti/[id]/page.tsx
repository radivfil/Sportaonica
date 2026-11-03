import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { Checkbox, Flash, PageTitle, Select, TextArea, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { saveActivity } from "../../../actions";

export const metadata = { title: "Aktivnost" };

export default async function ActivityEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "nova";
  const a = isNew ? null : await repo().getActivity(id);
  if (!isNew && !a) notFound();
  return (
    <>
      <PageTitle title={isNew ? "Nova aktivnost" : `Uredi: ${a!.name}`}>
        <Link href="/admin/aktivnosti" className="btn-ghost">← Sve aktivnosti</Link>
      </PageTitle>
      <Flash error={sp.error} />
      <form action={saveActivity} className="card grid max-w-3xl gap-5 p-5 sm:p-8">
        {a && <input type="hidden" name="id" value={a.id} />}
        {a && <input type="hidden" name="slug" value={a.slug} />}
        <TextField label="Naziv" name="name" defaultValue={a?.name} required />
        <TextArea label="Kratki opis (kartica)" name="shortDescription" rows={2} maxLength={240} defaultValue={a?.shortDescription} required />
        <TextArea label="Dulji opis (stranica Aktivnosti)" name="description" rows={5} defaultValue={a?.description} />
        <div className="grid gap-4 sm:grid-cols-4">
          <TextField label="Dob od" name="ageMin" type="number" min={2} max={18} defaultValue={a?.ageMin ?? 5} required />
          <TextField label="Dob do" name="ageMax" type="number" min={2} max={18} defaultValue={a?.ageMax ?? 8} required />
          <Select label="Ikona" name="icon" defaultValue={a?.icon ?? "universal"}>
            <option value="universal">Univerzalno</option>
            <option value="handball">Rukomet</option>
            <option value="ball">Lopta</option>
            <option value="obstacle">Poligon</option>
          </Select>
          <Select label="Boja" name="color" defaultValue={a?.color ?? "teal"}>
            <option value="teal">Tirkizna</option>
            <option value="pink">Roza</option>
            <option value="butter">Žuta</option>
            <option value="sky">Plava</option>
          </Select>
          <TextField label="Redoslijed" name="order" type="number" defaultValue={a?.order ?? 10} hint="Manji broj = prije." />
        </div>
        <Checkbox label="Arhivirano (skriveno s web stranice)" name="archived" defaultChecked={a?.status === "archived"} />
        <SubmitButton className="btn-primary justify-self-start">Spremi aktivnost</SubmitButton>
      </form>
    </>
  );
}
