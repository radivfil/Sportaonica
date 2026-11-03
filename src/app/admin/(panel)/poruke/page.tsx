import { repo } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { PageTitle } from "@/components/admin/Fields";

export const metadata = { title: "Poruke" };

export default async function Messages() {
  const messages = await repo().listContactMessages();
  return (
    <>
      <PageTitle title="Poruke s weba" intro="Upiti poslani putem kontakt obrasca." />
      {messages.length === 0 ? (
        <p className="card p-6 text-ink-soft">Još nema poruka.</p>
      ) : (
        <ul className="grid gap-3">
          {messages.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-extrabold">{m.name}</p>
                <p className="text-sm text-ink-soft">{formatDateTime(m.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm">
                <a href={`mailto:${m.email}`} className="font-bold text-navy underline">{m.email}</a>
                {m.phone && <> · <a href={`tel:${m.phone}`} className="font-bold text-navy underline">{m.phone}</a></>}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-ink">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
