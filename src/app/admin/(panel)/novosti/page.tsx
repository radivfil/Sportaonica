import Link from "next/link";
import { adminRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Flash, PageTitle } from "@/components/admin/Fields";

export const metadata = { title: "Novosti" };

export default async function PostsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const posts = await (await adminRepo()).listPosts();
  return (
    <>
      <PageTitle title="Novosti" intro="Obavijesti koje se prikazuju na početnoj i stranici Novosti.">
        <Link href="/admin/novosti/nova" className="btn-primary">+ Nova objava</Link>
      </PageTitle>
      <Flash ok={sp.ok} />
      <ul className="grid gap-3">
        {posts.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="text-lg font-extrabold">{p.title}</p>
              <p className="text-sm text-ink-soft">
                <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${p.status === "published" ? "bg-teal-100 text-teal-700" : "bg-butter-200 text-ink"}`}>
                  {p.status === "published" ? "Objavljeno" : "Skica"}
                </span>
                {p.publishedAt ? formatDate(p.publishedAt) : "—"} · /novosti/{p.slug}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/novosti/${p.slug}`} target="_blank" className="btn !min-h-[44px] bg-white !px-4 text-navy ring-1 ring-ink/15">Pregled ↗</Link>
              <Link href={`/admin/novosti/${p.id}`} className="btn-navy !min-h-[44px] !px-4">Uredi</Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
