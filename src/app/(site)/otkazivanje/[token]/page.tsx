import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { publicRepo } from "@/lib/data";
import { cancelWithToken } from "@/lib/booking";
import { Icon } from "@/components/ui/Icon";
import { slotWhen } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { STATUS_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "Moja prijava", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

/**
 * The parent's personal page (link from the confirmation e-mail). The token is
 * never stored — only its SHA-256 hash. Viewing is a GET (safe for e-mail link
 * scanners); cancelling is a POST server action (CSRF-protected by Next.js).
 */
async function cancelAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const ids = formData.getAll("id").map(String).filter(Boolean);
  const back = `/otkazivanje/${encodeURIComponent(token)}`;
  if (!(await rateLimit("cancel", clientIp(await headers()), 10, 600)).ok) redirect(`${back}?greska=1`);
  const res = await cancelWithToken(token, ids.length ? ids : undefined);
  redirect(`${back}?otkazano=${res.cancelled.length}&kasno=${res.tooLate.length}`);
}

export default async function CancelPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ otkazano?: string; kasno?: string; greska?: string }> }) {
  const { token: raw } = await params;
  const sp = await searchParams;
  const token = decodeURIComponent(raw);
  const repo = publicRepo();
  const [regs, slots, activities, locations, settings] = await Promise.all([
    repo.registrationsByToken(token),
    repo.listSlots(),
    repo.listActivities(),
    repo.listLocations(),
    repo.getSettings(),
  ]);
  const slotMap = new Map(slots.map((s) => [s.id, s]));
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const locMap = new Map(locations.map((l) => [l.id, l]));
  const open = regs.filter((r) => r.status === "active" || r.status === "waitlist");
  const cancellable = open.filter((r) => r.cancellable);
  const cancelledNow = Number(sp.otkazano ?? 0);

  if (!regs.length) {
    return (
      <div className="container max-w-2xl py-16 sm:py-24">
        <div className="card p-6 text-center sm:p-10">
          <h1 className="text-3xl font-extrabold">Poveznica nije valjana</h1>
          <p className="mt-3 text-ink-soft">Prijava nije pronađena ili su podaci obrisani. Ako trebate pomoć, nazovite nas ili nam pošaljite e-mail.</p>
          <Link href="/kontakt" className="btn-navy mt-6">Kontakt</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-16 sm:py-24">
      <div className="card p-6 sm:p-10">
        <h1 className="text-center text-3xl font-extrabold">Moja prijava: {regs[0].childName}</h1>
        {cancelledNow > 0 && (
          <p role="status" className="mt-5 flex items-center gap-3 rounded-2xl bg-teal-100 p-4 font-bold text-teal-700">
            <Icon name="check" className="h-6 w-6 shrink-0" /> Otkazano: {cancelledNow}. Hvala što ste oslobodili mjesto! Potvrdu smo poslali e-mailom.
          </p>
        )}
        {Number(sp.kasno ?? 0) > 0 && (
          <p role="alert" className="mt-5 rounded-2xl bg-coral-100 p-4 font-bold text-coral-700">
            Neke termine više nije moguće otkazati putem poveznice (rok je {settings.cancelDeadlineHours} h prije početka). Nazovite nas na {settings.phone}.
          </p>
        )}
        {sp.greska && (
          <p role="alert" className="mt-5 rounded-2xl bg-coral-100 p-4 font-bold text-coral-700">
            Previše pokušaja. Pričekajte nekoliko minuta.
          </p>
        )}

        <ul className="mt-6 grid gap-2">
          {regs.map((r) => {
            const s = slotMap.get(r.slotId);
            const a = s && actMap.get(s.activityId);
            const l = s && locMap.get(s.locationId);
            const isOpen = r.status === "active" || r.status === "waitlist";
            return (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${isOpen ? "bg-pink-50" : "bg-ink/5 text-ink-soft"}`}>
                <span className="min-w-0">
                  <span className="block font-extrabold">{a?.name ?? "Termin"}</span>
                  <span className="block text-sm font-semibold">
                    {s ? slotWhen(s) : "Termin je završen"}
                    {l ? ` · ${l.name}` : ""}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold">{STATUS_LABEL[r.status]}</span>
                  {isOpen && r.cancellable && regs.length > 1 && (
                    <form action={cancelAction}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn !min-h-[44px] bg-white !px-4 text-coral-700 ring-1 ring-coral/40">Otkaži ovaj</button>
                    </form>
                  )}
                  {isOpen && !r.cancellable && <span className="text-sm font-bold text-coral-700">Rok za otkazivanje je prošao</span>}
                </span>
              </li>
            );
          })}
        </ul>

        {cancellable.length > 0 ? (
          <>
            <p className="mt-6 text-center text-ink-soft">Otkazivanjem se mjesto oslobađa i automatski dodjeljuje prvome s liste čekanja.</p>
            <form action={cancelAction} className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn-primary">{cancellable.length > 1 ? `Otkaži sve (${cancellable.length})` : "Da, otkaži prijavu"}</button>
              <Link href="/" className="btn-secondary">Ne, zadrži prijavu</Link>
            </form>
          </>
        ) : (
          <div className="mt-6 text-center">
            <Link href="/aktivnosti" className="btn-primary">Pogledaj programe</Link>
          </div>
        )}
      </div>
    </div>
  );
}
