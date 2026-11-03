import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/data";
import { cancelWithToken, describeSlot } from "@/lib/booking";
import { Icon } from "@/components/ui/Icon";
import { formatBirthDate } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Otkazivanje prijave", robots: { index: false, follow: false } };

async function cancelAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!rateLimit(`cancel:${token.slice(0, 12)}`, 5, 60_000).ok) redirect(`/otkazivanje/${encodeURIComponent(token)}`);
  await cancelWithToken(token);
  redirect(`/otkazivanje/${encodeURIComponent(token)}?otkazano=1`);
}

export default async function CancelPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ otkazano?: string }> }) {
  const { token } = await params;
  const { otkazano } = await searchParams;
  const reg = await repo().getRegistrationByToken(decodeURIComponent(token));
  const slot = reg ? await describeSlot(reg.slotId) : null;

  return (
    <div className="container max-w-2xl py-16 sm:py-24">
      <div className="card p-6 text-center sm:p-10">
        {!reg || !slot ? (
          <>
            <h1 className="text-3xl font-extrabold">Poveznica nije valjana</h1>
            <p className="mt-3 text-ink-soft">Prijava nije pronađena. Ako trebate pomoć, nazovite nas ili nam pošaljite e-mail.</p>
            <Link href="/kontakt" className="btn-navy mt-6">Kontakt</Link>
          </>
        ) : reg.status === "cancelled" ? (
          <>
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-200">
              <Icon name="check" className="h-8 w-8" />
            </span>
            <h1 className="mt-4 text-3xl font-extrabold">{otkazano ? "Prijava je otkazana" : "Prijava je već otkazana"}</h1>
            <p className="mt-3 text-ink-soft">
              Hvala što ste oslobodili mjesto za {slot.activityName} ({slot.locationName}). Poslali smo vam potvrdu e-mailom.
            </p>
            <Link href="/upisi" className="btn-primary mt-6">Nova prijava</Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold">Otkazati prijavu?</h1>
            <dl className="mx-auto mt-6 grid max-w-md gap-2 rounded-3xl bg-pink-50 p-5 text-left">
              {[
                ["Dijete", `${reg.childName} (${formatBirthDate(reg.childBirthDate)})`],
                ["Aktivnost", slot.activityName],
                ["Lokacija", slot.locationName],
                ["Termin", `${slot.day}, ${slot.time}`],
                ["Status", reg.status === "waitlist" ? "Lista čekanja" : "Upisan/a"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="font-semibold text-ink-soft">{k}</dt>
                  <dd className="text-right font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-ink-soft">Otkazivanjem se mjesto oslobađa i automatski dodjeljuje prvom djetetu s liste čekanja.</p>
            <form action={cancelAction} className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <input type="hidden" name="token" value={reg.cancelToken} />
              <button type="submit" className="btn-primary">Da, otkaži prijavu</button>
              <Link href="/" className="btn-secondary">Ne, zadrži prijavu</Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
