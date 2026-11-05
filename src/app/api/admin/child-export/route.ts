import { adminRepo } from "@/lib/data";
import { STATUS_LABEL, lookups } from "@/lib/admin-data";
import { slotWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * GDPR right of access / portability: every registration of one child
 * (same name + birth date), as JSON. GET /api/admin/child-export?id=<registration id>
 */
export async function GET(req: Request) {
  const repo = await adminRepo();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const reg = await repo.getRegistration(id);
  if (!reg || reg.anonymizedAt) return new Response("Not found", { status: 404 });
  const { slotMap, actMap, locMap } = await lookups(repo);
  const all = (await repo.listRegistrations({ q: reg.childName })).filter(
    (r) => r.childBirthDate === reg.childBirthDate && r.childName.trim().toLowerCase() === reg.childName.trim().toLowerCase() && !r.anonymizedAt,
  );
  const data = {
    izvezeno: new Date().toISOString(),
    voditelj_obrade: "Sportaonica (podaci obrta: vidi Postavke)",
    polaznik: { ime: reg.childName, datum_rodenja: reg.childBirthDate },
    roditelj: { ime: reg.parentName, email: reg.email, telefon: reg.phone },
    prijave: all.map((r) => {
      const s = slotMap.get(r.slotId);
      return {
        status: STATUS_LABEL[r.status],
        aktivnost: s ? actMap.get(s.activityId)?.name : null,
        lokacija: s ? locMap.get(s.locationId)?.name : null,
        termin: s ? slotWhen(s) : null,
        napomena_o_zdravlju: r.healthNote ?? null,
        privola_gdpr: r.gdprConsent,
        placeno: r.paid,
        prijavljeno: r.createdAt,
        otkazano: r.cancelledAt ?? null,
      };
    }),
  };
  await repo.audit("registration.export_child", reg.id, `${all.length} prijava`);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="podaci-${reg.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
