import Link from "next/link";
import { repo } from "@/lib/data";
import { ActivityIcon } from "@/components/home/ActivityIcon";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteActivity } from "../../actions";

export const metadata = { title: "Aktivnosti" };

export default async function ActivitiesAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const activities = await repo().listActivities({ includeArchived: true });
  return (
    <>
      <PageTitle title="Aktivnosti" intro="Programi koji se prikazuju na web stranici.">
        <Link href="/admin/aktivnosti/nova" className="btn-primary">+ Nova aktivnost</Link>
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <ul className="grid gap-3 md:grid-cols-2">
        {activities.map((a) => (
          <li key={a.id} className={`card flex gap-4 p-5 ${a.status === "archived" ? "opacity-60" : ""}`}>
            <ActivityIcon icon={a.icon} color={a.color} className="h-16 w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold">{a.name}</p>
              <p className="text-sm font-semibold text-ink-soft">
                {a.ageMin}–{a.ageMax} god. {a.status === "archived" && "· ARHIVIRANO"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{a.shortDescription}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/admin/aktivnosti/${a.id}`} className="btn-navy !min-h-[44px] !px-4">Uredi</Link>
                <form action={deleteActivity}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message="Obrisati aktivnost? Ako ima termine, umjesto toga je arhivirajte." className="btn !min-h-[44px] bg-coral-100 !px-4 text-coral-700">Obriši</ConfirmButton>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
