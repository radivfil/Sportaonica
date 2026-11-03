import Link from "next/link";
import { repo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { formatDateTime, startOfDay, startOfWeek } from "@/lib/format";
import { FillBar } from "@/components/booking/FillBar";
import { PageTitle, STATUS_CLASS, STATUS_LABEL } from "@/components/admin/Fields";

export const metadata = { title: "Pregled" };

export default async function Dashboard() {
  const [{ slots, slotLabel, slotMap }, regs, messages] = await Promise.all([lookups(), repo().listRegistrations(), repo().listContactMessages()]);
  const today = startOfDay().toISOString();
  const week = startOfWeek().toISOString();
  const active = regs.filter((r) => r.status !== "cancelled");
  const stats = [
    { label: "Prijave danas", value: active.filter((r) => r.createdAt >= today).length, bg: "bg-pink-100" },
    { label: "Prijave ovaj tjedan", value: active.filter((r) => r.createdAt >= week).length, bg: "bg-teal-100" },
    { label: "Na listi čekanja", value: regs.filter((r) => r.status === "waitlist").length, bg: "bg-butter-100" },
    { label: "Neplaćeno (upisani)", value: regs.filter((r) => r.status === "confirmed" && !r.paid).length, bg: "bg-sky-100" },
  ];
  const activeSlots = slots.filter((s) => s.status === "active");
  const totalCap = activeSlots.reduce((n, s) => n + s.capacity, 0);
  const totalTaken = activeSlots.reduce((n, s) => n + s.taken, 0);

  return (
    <>
      <PageTitle title="Dobar dan! 👋" intro="Brzi pregled prijava i popunjenosti termina.">
        <Link href="/admin/prijave/nova" className="btn-primary">+ Dodaj prijavu</Link>
      </PageTitle>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-3xl ${s.bg} p-5`}>
            <dt className="text-sm font-bold text-ink-soft">{s.label}</dt>
            <dd className="mt-1 font-display text-4xl font-extrabold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="fill-t">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="fill-t" className="text-2xl font-extrabold">Popunjenost termina</h2>
            <span className="text-sm font-bold text-ink-soft">
              ukupno {totalTaken}/{totalCap} ({Math.round((totalTaken / Math.max(1, totalCap)) * 100)}%)
            </span>
          </div>
          <ul className="mt-4 grid gap-3">
            {activeSlots.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/prijave?termin=${s.id}`} className="block rounded-2xl p-2 hover:bg-cream">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 font-bold text-ink">{slotLabel(s)}</span>
                    <span className="shrink-0 font-bold text-ink-soft">
                      {s.taken}/{s.capacity}
                      {s.waitlistCount > 0 && <span className="ml-2 rounded-full bg-butter-200 px-2 text-ink">+{s.waitlistCount} čeka</span>}
                    </span>
                  </div>
                  <FillBar taken={s.taken} capacity={s.capacity} className="mt-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid content-start gap-6">
          <section className="card p-5 sm:p-6" aria-labelledby="recent-t">
            <h2 id="recent-t" className="text-2xl font-extrabold">Najnovije prijave</h2>
            <ul className="mt-4 grid gap-2">
              {regs.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/prijave/${r.id}`} className="flex items-center justify-between gap-3 rounded-2xl p-2 hover:bg-cream">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{r.childName}</span>
                      <span className="block truncate text-sm text-ink-soft">{slotLabel(slotMap.get(r.slotId))}</span>
                      <span className="block text-xs text-ink-faint">{formatDateTime(r.createdAt)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/admin/prijave" className="mt-3 inline-block font-bold text-navy underline">Sve prijave →</Link>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="text-2xl font-extrabold">Poruke s weba</h2>
            <p className="mt-2 text-ink-soft">{messages.length === 0 ? "Nema novih poruka." : `${messages.length} poruka ukupno.`}</p>
            <Link href="/admin/poruke" className="mt-3 inline-block font-bold text-navy underline">Otvori poruke →</Link>
          </section>
        </div>
      </div>
    </>
  );
}
