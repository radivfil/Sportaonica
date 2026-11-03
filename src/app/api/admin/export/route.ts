import { repo } from "@/lib/data";
import type { RegistrationStatus } from "@/lib/data/types";
import { isAdmin } from "@/lib/admin-guard";
import { lookups } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";
import { ageOn } from "@/lib/age";
import { WEEKDAYS, formatBirthDate, formatDateTime } from "@/lib/format";

const STATUS: Record<RegistrationStatus, string> = { confirmed: "Upisan/a", waitlist: "Lista čekanja", cancelled: "Otkazano" };

/**
 * GET /api/admin/export?format=csv|excel&aktivnost=&lokacija=&termin=&status=&q=
 * Both formats are UTF-8 with BOM. "excel" uses ';' which Croatian-locale Excel
 * opens directly into columns; "csv" uses ',' for Google Sheets / Numbers.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const [{ slotMap, actMap, locMap }, regs] = await Promise.all([
    lookups(),
    repo().listRegistrations({
      activityId: sp.get("aktivnost") || undefined,
      locationId: sp.get("lokacija") || undefined,
      slotId: sp.get("termin") || undefined,
      status: (sp.get("status") as RegistrationStatus) || undefined,
      q: sp.get("q") || undefined,
    }),
  ]);
  const excel = sp.get("format") === "excel";
  const headers = [
    "Status", "Aktivnost", "Lokacija", "Dan", "Vrijeme", "Dijete", "Datum rođenja", "Dob", "Roditelj", "Telefon", "E-mail",
    "Napomena o zdravlju", "Kako su čuli", "Plaćeno", "Marketing privola", "Interna napomena", "Prijavljeno",
  ];
  const rows = regs.map((r) => {
    const s = slotMap.get(r.slotId);
    return [
      STATUS[r.status],
      s ? actMap.get(s.activityId)?.name : "",
      s ? locMap.get(s.locationId)?.name : "",
      s ? WEEKDAYS[s.dayOfWeek] : "",
      s ? `${s.startTime}–${s.endTime}` : "",
      r.childName,
      formatBirthDate(r.childBirthDate),
      ageOn(r.childBirthDate),
      r.parentName,
      r.phone,
      r.email,
      r.healthNote ?? "",
      r.source ?? "",
      r.paid ? "da" : "ne",
      r.marketingConsent ? "da" : "ne",
      r.adminNote ?? "",
      formatDateTime(r.createdAt),
    ];
  });
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
