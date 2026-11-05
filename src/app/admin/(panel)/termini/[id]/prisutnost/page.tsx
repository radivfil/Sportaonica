import { notFound } from "next/navigation";
import { adminRepo } from "@/lib/data";
import { lookups } from "@/lib/admin-data";
import { ageYears } from "@/lib/data/rules";
import { slotWhen } from "@/lib/format";
import { PrintButton } from "@/components/admin/ui";

export const metadata = { title: "Popis prisutnih" };

export default async function Attendance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await adminRepo();
  const { slotMap, actMap, locMap } = await lookups(repo);
  const slot = slotMap.get(id);
  if (!slot) notFound();
  const [regs, waiting] = await Promise.all([repo.listRegistrations({ slotId: id, status: "active" }), repo.listRegistrations({ slotId: id, status: "waitlist" })]);
  regs.sort((a, b) => a.childName.localeCompare(b.childName, "hr"));
  await repo.audit("attendance.print", id, `${regs.length} polaznika`);
  const columns = slot.kind === "single" ? 1 : 8;

  return (
    <div className="bg-white p-4 print:p-0 sm:p-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">Savjet: ispis u vodoravnoj orijentaciji. Popis sadrži osobne podatke, pa ga nakon upotrebe uništite.</p>
        <PrintButton />
      </div>
      <h1 className="text-2xl font-extrabold">Popis prisutnih: {actMap.get(slot.activityId)?.name}</h1>
      <p className="mt-1 font-semibold">
        {locMap.get(slot.locationId)?.name} · {slotWhen(slot)} · upisano {regs.length}/{slot.capacity}
      </p>
      <div className="overflow-x-auto">
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-ink/40 p-1.5 text-left">#</th>
              <th className="border border-ink/40 p-1.5 text-left">Polaznik</th>
              <th className="border border-ink/40 p-1.5 text-left">Dob</th>
              <th className="border border-ink/40 p-1.5 text-left">Roditelj / telefon</th>
              <th className="border border-ink/40 p-1.5 text-left">Zdravlje</th>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="w-12 border border-ink/40 p-1.5 text-center text-xs font-normal">__.__.</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regs.map((r, i) => (
              <tr key={r.id}>
                <td className="border border-ink/40 p-1.5">{i + 1}</td>
                <td className="border border-ink/40 p-1.5 font-bold">
                  {r.childName}
                  {r.paid ? "" : " *"}
                </td>
                <td className="border border-ink/40 p-1.5">{r.childBirthDate ? ageYears(r.childBirthDate) : ""}</td>
                <td className="border border-ink/40 p-1.5">
                  {r.parentName}
                  <br />
                  {r.phone}
                </td>
                <td className="border border-ink/40 p-1.5 text-xs">{r.healthNote ?? ""}</td>
                {Array.from({ length: columns }).map((_, j) => <td key={j} className="border border-ink/40 p-1.5" />)}
              </tr>
            ))}
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-ink/40 p-1.5">&nbsp;</td>
                <td className="border border-ink/40 p-1.5" colSpan={4} />
                {Array.from({ length: columns }).map((_, j) => <td key={j} className="border border-ink/40 p-1.5" />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs">* članarina nije označena kao plaćena</p>
      {waiting.length > 0 && (
        <p className="mt-3 text-sm">
          <strong>Lista čekanja:</strong> {waiting.map((w) => `${w.childName} (${w.phone})`).join(", ")}
        </p>
      )}
    </div>
  );
}
