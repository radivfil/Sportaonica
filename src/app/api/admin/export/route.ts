import { adminRepo } from "@/lib/data";
import type { RegistrationStatus } from "@/lib/data/types";
import { STATUS_LABEL, lookups } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";
import { ageYears } from "@/lib/data/rules";
import { formatBirthDate, formatDateTime, slotWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/export?format=csv|excel&aktivnost=&lokacija=&termin=&status=&q=
 * Both formats are UTF-8 with BOM. "excel" uses ';' (Croatian-locale Excel opens
 * it directly in columns); "csv" uses ',' (Google Sheets / Numbers).
 * Every export is written to the audit log.
 */
export async function GET(req: Request) {
  const repo = await adminRepo();
  const sp = new URL(req.url).searchParams;
  const filter = {
    activityId: sp.get("aktivnost") || undefined,
    locationId: sp.get("lokacija") || undefined,
    slotId: sp.get("termin") || undefined,
    status: (sp.get("status") as RegistrationStatus) || undefined,
    q: sp.get("q") || undefined,
  };
  const [{ slotMap, actMap, locMap }, regs] = await Promise.all([lookups(repo), repo.listRegistrations(filter)]);
  const rows = regs
    .filter((r) => !r.anonymizedAt)
    .map((r) => {
      const s = slotMap.get(r.slotId);
      return [
        STATUS_LABEL[r.status],
        s ? actMap.get(s.activityId)?.name : "",
        s ? locMap.get(s.locationId)?.name : "",
        s ? slotWhen(s) : "",
        r.childName,
        r.childBirthDate ? formatBirthDate(r.childBirthDate) : "",
        r.childBirthDate ? ageYears(r.childBirthDate) : "",
        r.parentName,
        r.phone,
        r.email,
        r.healthNote ?? "",
        r.paid ? "da" : "ne",
        r.adminNote ?? "",
        formatDateTime(r.createdAt),
      ];
    });
  const excel = sp.get("format") === "excel";
  const headers = ["Status", "Aktivnost", "Lokacija", "Termin", "Polaznik", "Datum rođenja", "Dob", "Roditelj", "Telefon", "E-mail", "Napomena o zdravlju", "Plaćeno", "Interna napomena", "Prijavljeno"];
  await repo.audit("registration.export", undefined, `${rows.length} redaka; filter=${JSON.stringify(filter)}`);
  const body = toCsv(headers, rows, excel ? ";" : ",");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sportaonica-prijave-${date}${excel ? "-excel" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
