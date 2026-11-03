import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { ageOn } from "@/lib/age";
import { WEEKDAYS } from "@/lib/format";
import { PrintButton } from "@/components/admin/ui";

export const metadata = { title: "Popis prisutnosti" };

export default async function Attendance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { slotMap, actMap, locMap } = await lookups();
  const slot = slotMap.get(id);
  if (!slot) notFound();
  const regs = (await repo().listRegistrations({ slotId: id, status: "confirmed" })).sort((a, b) => a.childName.localeCompare(b.childName, "hr"));
  const waiting = await repo().listRegistrations({ slotId: id, status: "waitlist" });
  const dates = Array.from({ length: 8 });

  return (
    <div className="bg-white p-4 print:p-0 sm:p-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">Savjet: ispis u vodoravnoj orijentaciji (landscape).</p>
        <PrintButton />
      </div>
      <h1 className="text-2xl font-extrabold">
        Popis prisutnosti — {actMap.get(slot.activityId)?.name}
      </h1>
      <p className="mt-1 font-semibold">
        {locMap.get(slot.locationId)?.name} · {WEEKDAYS[slot.dayOfWeek]} {slot.startTime}–{slot.endTime} · upisano {regs.length} (+{slot.preEnrolled} izvan weba) / {slot.capacity}
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-ink/40 p-1.5 text-left">#</th>
            <th className="border border-ink/40 p-1.5 text-left">Dijete</th>
            <th className="border border-ink/40 p-1.5 text-left">Dob</th>
            <th className="border border-ink/40 p-1.5 text-left">Roditelj / telefon</th>
            <th className="border border-ink/40 p-1.5 text-left">Zdravlje</th>
            {dates.map((_, i) => (
              <th key={i} className="w-12 border border-ink/40 p-1.5 text-center text-xs font-normal">__.__.</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regs.map((r, i) => (
            <tr key={r.id}>
              <td className="border border-ink/40 p-1.5">{i + 1}</td>
              <td className="border border-ink/40 p-1.5 font-bold">{r.childName}{r.paid ? "" : " *"}</td>
              <td className="border border-ink/40 p-1.5">{ageOn(r.childBirthDate)}</td>
              <td className="border border-ink/40 p-1.5">{r.parentName}<br />{r.phone}</td>
              <td className="border border-ink/40 p-1.5 text-xs">{r.healthNote ?? ""}</td>
              {dates.map((_, j) => <td key={j} className="border border-ink/40 p-1.5" />)}
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-ink/40 p-1.5">&nbsp;</td>
              <td className="border border-ink/40 p-1.5" colSpan={4} />
              {dates.map((_, j) => <td key={j} className="border border-ink/40 p-1.5" />)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs">* članarina nije označena kao plaćena</p>
      {waiting.length > 0 && (
        <p className="mt-3 text-sm">
          <strong>Lista čekanja:</strong> {waiting.map((w) => `${w.childName} (${w.phone})`).join(", ")}
        </p>
      )}
    </div>
  );
}
