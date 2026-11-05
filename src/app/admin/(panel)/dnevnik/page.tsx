import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { PageTitle } from "@/components/admin/Fields";

export const metadata = { title: "Dnevnik promjena" };

const LABEL: Record<string, string> = {
  "registration.create": "Nova prijava",
  "registration.update": "Izmjena prijave",
  "registration.cancel": "Otkazivanje",
  "registration.move": "Premještanje",
  "registration.promote": "S liste čekanja",
  "registration.anonymize": "Brisanje podataka (GDPR)",
  "registration.export": "Izvoz prijava",
  "registration.export_child": "Izvoz podataka polaznika",
  "attendance.print": "Ispis popisa prisutnih",
  "auth.login": "Prijava u admin",
  "auth.logout": "Odjava",
};

/** Append-only audit trail: who changed, cancelled or exported registrations, and when. */
export default async function AuditPage() {
  const entries = await (await adminRepo()).listAudit(300);
  return (
    <>
      <PageTitle title="Dnevnik promjena" intro="Tko je i kada mijenjao, otkazivao ili izvozio prijave. Zapisi se ne mogu mijenjati ni brisati." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-cream text-left">
            <tr>
              <th className="p-3">Vrijeme</th>
              <th className="p-3">Tko</th>
              <th className="p-3">Radnja</th>
              <th className="p-3">Detalji</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-ink/10 align-top">
                <td className="whitespace-nowrap p-3">{formatDateTime(e.at)}</td>
                <td className="p-3">{e.actor}</td>
                <td className="p-3 font-bold">
                  {e.entityId && e.action.startsWith("registration.") && !e.action.startsWith("registration.export") ? (
                    <Link href={`/admin/prijave/${e.entityId}`} className="text-navy underline">{LABEL[e.action] ?? e.action}</Link>
                  ) : (
                    LABEL[e.action] ?? e.action
                  )}
                </td>
                <td className="break-words p-3 text-ink-soft">{e.details}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-ink-soft">Još nema zapisa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
