import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { ageRangeLabel } from "@/lib/data/rules";
import { ActivityIcon } from "@/components/home/ActivityIcon";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { deleteActivity, duplicateActivity } from "../../actions";

export const metadata = { title: "Aktivnosti" };

export default async function ActivitiesAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const activities = await (await adminRepo()).listActivities({ includeArchived: true });
  const groups = [
    { title: "Programi za djecu", items: activities.filter((a) => a.audience === "kids") },
    { title: "Programi za odrasle", items: activities.filter((a) => a.audience === "adults") },
  ];
  return (
    <>
      <PageTitle title="Aktivnosti" intro="Programi koji se prikazuju na web stranici. Dobni raspon provjerava se pri svakoj prijavi.">
        <Link href="/admin/aktivnosti/nova" className="btn-primary">+ Nova aktivnost</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      {groups.map((g) => (
        <section key={g.title} className="mb-8" aria-label={g.title}>
          <h2 className="mb-3 text-2xl font-extrabold">{g.title}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {g.items.map((a) => (
              <li key={a.id} className={`card flex min-w-0 gap-4 p-5 ${a.status === "archived" ? "opacity-60" : ""}`}>
                <ActivityIcon icon={a.icon} color={a.color} className="h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-extrabold">{a.name}</p>
                  <p className="text-sm font-semibold text-ink-soft">
                    {ageRangeLabel(a)}
                    {a.withParent && " · uz roditelja"}
                    {a.status === "archived" && " · ARHIVIRANO"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{a.shortDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/admin/aktivnosti/${a.id}`} className="btn-navy !min-h-[44px] !px-4">Uredi</Link>
                    <form action={duplicateActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Dupliciraj</SubmitButton>
                    </form>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message="Obrisati aktivnost? Ako ima termine, umjesto toga je arhivirajte." className="btn !min-h-[44px] bg-coral-100 !px-4 text-coral-700">
                        Obriši
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
            {g.items.length === 0 && <li className="text-ink-soft">Nema programa.</li>}
          </ul>
        </section>
      ))}
    </>
  );
}
