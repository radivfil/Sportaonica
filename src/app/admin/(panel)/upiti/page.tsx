import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { formatDateTime, formatYmd, telHref } from "@/lib/format";
import { Flash, PageTitle } from "@/components/admin/Fields";
import { SubmitButton } from "@/components/admin/ui";
import { toggleInquiryHandled } from "../../actions";

export const metadata = { title: "Upiti i rođendani" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; tip?: string }> }) {
  const sp = await searchParams;
  const all = (await (await adminRepo()).listInquiries()).filter((i) => i.email !== "obrisano@invalid");
  const tip = sp.tip === "birthday" || sp.tip === "contact" ? sp.tip : undefined;
  const list = tip ? all.filter((i) => i.type === tip) : all;
  const tabs: [string | undefined, string][] = [
    [undefined, `Svi (${all.length})`],
    ["birthday", `Rođendani (${all.filter((i) => i.type === "birthday").length})`],
    ["contact", `Poruke (${all.filter((i) => i.type === "contact").length})`],
  ];
  return (
    <>
      <PageTitle title="Upiti i rođendani" intro="Upiti za rođendane i poruke s kontakt obrasca." />
      <Flash ok={sp.ok} error={sp.error} />
      <nav aria-label="Vrsta upita" className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([t, label]) => (
          <Link
            key={label}
            href={t ? `/admin/upiti?tip=${t}` : "/admin/upiti"}
            aria-current={tip === t ? "page" : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 font-bold ${tip === t ? "bg-navy text-white" : "bg-white text-ink ring-1 ring-ink/10"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">Nema upita.</p>
      ) : (
        <ul className="grid gap-3">
          {list.map((i) => (
            <li key={i.id} className={`card p-5 ${i.handled ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${i.type === "birthday" ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-ink"}`}>
                      {i.type === "birthday" ? "🎂 Rođendan" : "✉️ Poruka"}
                    </span>
                    {i.handled && <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-700">Riješeno</span>}
                    <span className="text-xs text-ink-soft">{formatDateTime(i.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-words text-lg font-extrabold">{i.name}</p>
                  {i.type === "birthday" && (
                    <p className="font-semibold text-ink">
                      Datum: {i.eventDate ? formatYmd(i.eventDate) : "—"} · Broj djece: {i.childrenCount ?? "—"} · Dob slavljenika: {i.childAge ?? "—"}
                    </p>
                  )}
                  {i.message && <p className="mt-2 whitespace-pre-wrap break-words text-ink">{i.message}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {i.phone && <a href={telHref(i.phone)} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">📞 Nazovi</a>}
                  <a href={`mailto:${i.email}`} className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">✉️ Odgovori</a>
                  <form action={toggleInquiryHandled}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="handled" value={String(i.handled)} />
                    <input type="hidden" name="returnTo" value={tip ? `/admin/upiti?tip=${tip}` : "/admin/upiti"} />
                    <SubmitButton className="btn-navy !min-h-[44px] !px-4" pendingLabel="…">{i.handled ? "Vrati u nove" : "Označi riješeno"}</SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
