import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { formatDateTime, formatYmd, startOfDay, startOfWeek } from "@/lib/format";
import { FillBar } from "@/components/booking/FillBar";
import { PageTitle, STATUS_CLASS, STATUS_LABEL } from "@/components/admin/Fields";
import { EMAIL_DAILY_LIMIT, EMAIL_WARN_AT } from "@/lib/notifications";

export const metadata = { title: "Pregled" };

export default async function Dashboard() {
  const repo = await adminRepo();
  const [{ slots, slotLabel, slotMap }, regs, inquiries, emailsToday, pendingMail] = await Promise.all([
    lookups(repo),
    repo.listRegistrations(),
    repo.listInquiries(),
    repo.emailUsageToday(),
    repo.pendingOutboxCount(),
  ]);
  const today = startOfDay().toISOString();
  const week = startOfWeek().toISOString();
  const open = regs.filter((r) => r.status === "active" || r.status === "waitlist");
  const newBirthdays = inquiries.filter((i) => i.type === "birthday" && !i.handled);
  const stats = [
    { label: "Prijave danas", value: open.filter((r) => r.createdAt >= today).length, bg: "bg-pink-100" },
    { label: "Prijave ovaj tjedan", value: open.filter((r) => r.createdAt >= week).length, bg: "bg-teal-100" },
    { label: "Na listi čekanja", value: regs.filter((r) => r.status === "waitlist").length, bg: "bg-butter-100" },
    { label: "Novi upiti za rođendan", value: newBirthdays.length, bg: "bg-sky-100" },
  ];
  const activeSlots = slots.filter((s) => s.status === "active" && !s.isPast);
  const totalCap = activeSlots.reduce((n, s) => n + s.capacity, 0);
  const totalTaken = activeSlots.reduce((n, s) => n + s.activeCount, 0);

  return (
    <>
      <PageTitle title="Dobar dan! 👋" intro="Brzi pregled prijava i popunjenosti termina.">
        <Link href="/admin/prijave/nova" className="btn-primary">+ Dodaj prijavu</Link>
      </PageTitle>

      {emailsToday >= EMAIL_WARN_AT && (
        <p role="alert" className="mb-5 rounded-2xl bg-coral-100 p-4 font-bold text-coral-700">
          ⚠️ Danas je poslano {emailsToday} od {EMAIL_DAILY_LIMIT} e-mailova (besplatni plan). Nakon limita e-mailovi čekaju u redu i šalju se sutra.
        </p>
      )}
      {pendingMail > 0 && (
        <p className="mb-5 rounded-2xl bg-butter-100 p-4 font-semibold text-ink">📨 E-mailova u redu za slanje: {pendingMail}. Šalju se automatski.</p>
      )}

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
                      {s.activeCount}/{s.capacity}
                      {s.waitlistCount > 0 && <span className="ml-2 rounded-full bg-butter-200 px-2 text-ink">+{s.waitlistCount} čeka</span>}
                    </span>
                  </div>
                  <FillBar taken={s.activeCount} capacity={s.capacity} className="mt-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid content-start gap-6">
          <section className="card p-5 sm:p-6" aria-labelledby="recent-t">
            <h2 id="recent-t" className="text-2xl font-extrabold">Najnovije prijave</h2>
            <ul className="mt-4 grid gap-2">
              {regs.filter((r) => !r.anonymizedAt).slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/prijave/${r.id}`} className="flex items-center justify-between gap-3 rounded-2xl p-2 hover:bg-cream">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{r.childName}</span>
                      <span className="block truncate text-sm text-ink-soft">{slotLabel(slotMap.get(r.slotId))}</span>
                      <span className="block text-xs text-ink-soft">{formatDateTime(r.createdAt)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/admin/prijave" className="mt-3 inline-block font-bold text-navy underline">Sve prijave →</Link>
          </section>
          <section className="card p-5 sm:p-6" aria-labelledby="bday-t">
            <h2 id="bday-t" className="text-2xl font-extrabold">Upiti za rođendane</h2>
            {newBirthdays.length === 0 ? (
              <p className="mt-2 text-ink-soft">Nema novih upita.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {newBirthdays.slice(0, 4).map((i) => (
                  <li key={i.id} className="rounded-2xl bg-cream p-3">
                    <span className="block font-bold">{i.name}</span>
                    <span className="text-sm text-ink-soft">
                      {i.eventDate ? formatYmd(i.eventDate) : "—"} · {i.childrenCount ?? "?"} djece · {i.childAge ?? "?"} god.
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/upiti" className="mt-3 inline-block font-bold text-navy underline">Svi upiti →</Link>
          </section>
          <p className="text-sm text-ink-soft">Danas poslano e-mailova: {emailsToday}/{EMAIL_DAILY_LIMIT}</p>
        </div>
      </div>
    </>
  );
}
