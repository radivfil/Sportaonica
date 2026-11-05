import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRepo } from "@/lib/data";
import { Checkbox, Flash, PageTitle, Select, TextArea, TextField } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { saveActivity } from "../../../actions";

export const metadata = { title: "Aktivnost" };

const ICONS: [string, string][] = [
  ["universal", "Univerzalno"],
  ["ball", "Lopta"],
  ["obstacle", "Poligon"],
  ["handball", "Rukomet"],
  ["toddler", "Najmlađi (uz roditelja)"],
  ["skates", "Rolanje / klizanje"],
  ["pilates", "Pilates"],
  ["functional", "Funkcionalni trening"],
  ["workshop", "Radionica"],
];

export default async function ActivityEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "nova";
  const a = isNew ? null : await (await adminRepo()).getActivity(id);
  if (!isNew && !a) notFound();
  return (
    <>
      <PageTitle title={isNew ? "Nova aktivnost" : `Uredi: ${a!.name}`}>
        <Link href="/admin/aktivnosti" className="btn-ghost">← Sve aktivnosti</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveActivity} className="card grid max-w-3xl gap-5 p-5 sm:p-8">
        {a && <input type="hidden" name="id" value={a.id} />}
        {a && <input type="hidden" name="slug" value={a.slug} />}
        <TextField label="Naziv" name="name" defaultValue={a?.name} required maxLength={80} />
        <Select label="Za koga je program?" name="audience" defaultValue={a?.audience ?? "kids"}>
          <option value="kids">Djeca</option>
          <option value="adults">Odrasli</option>
        </Select>
        <TextArea label="Kratki opis (kartica)" name="shortDescription" rows={2} maxLength={240} defaultValue={a?.shortDescription} required />
        <TextArea label="Dulji opis" name="description" rows={5} maxLength={3000} defaultValue={a?.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Dob od (godina)" name="ageMin" type="number" min={0} max={99} defaultValue={a?.ageMin ?? 4} required />
          <TextField label="Dob do (godina)" name="ageMax" type="number" min={0} max={99} defaultValue={a ? (a.ageMax ?? "") : 6} hint="Ostavite prazno ako nema gornje granice (npr. odrasli)." />
        </div>
        <Checkbox label="Dijete dolazi uz roditelja" name="withParent" defaultChecked={a?.withParent} hint="Npr. program za najmlađe." />
        <TextArea
          label="Ključni podaci za karticu (jedan po retku, najviše 6)"
          name="keyFacts"
          rows={3}
          defaultValue={a?.keyFacts.join("\n")}
          hint="Npr. „45 min”, „Do 12 djece”, „Uz roditelja”."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Ikona" name="icon" defaultValue={a?.icon ?? "universal"}>
            {ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
