import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { Flash, PageTitle, Select, TextArea, TextField } from "@/components/admin/Fields";
import { ConfirmButton, SubmitButton } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { deletePost, savePost } from "../../../actions";

export const metadata = { title: "Objava" };

export default async function PostEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "nova";
  const p = isNew ? null : await repo().getPost(id);
  if (!isNew && !p) notFound();
  return (
    <>
      <PageTitle title={isNew ? "Nova objava" : "Uredi objavu"}>
        <Link href="/admin/novosti" className="btn-ghost">← Sve objave</Link>
        {p && <Link href={`/novosti/${p.slug}`} target="_blank" className="btn-secondary">Pregled ↗</Link>}
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={savePost} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="card grid min-w-0 gap-5 p-5 sm:p-8">
          <TextField label="Naslov" name="title" defaultValue={p?.title} required />
          <TextArea label="Sažetak (prikazuje se na kartici)" name="excerpt" rows={2} maxLength={300} defaultValue={p?.excerpt} />
          <div>
            <span className="field-label">Sadržaj</span>
            <RichTextEditor name="contentHtml" initialHtml={p?.contentHtml ?? "<p></p>"} />
          </div>
        </div>
        <div className="grid content-start gap-5">
          <div className="card grid gap-4 p-5">
            <Select label="Status" name="status" defaultValue={p?.status ?? "draft"}>
              <option value="draft">Skica (nije javno)</option>
              <option value="published">Objavljeno</option>
            </Select>
            <SubmitButton className="btn-primary w-full">Spremi</SubmitButton>
          </div>
          <div className="card grid gap-4 p-5">
            <h2 className="text-lg font-extrabold">Naslovna slika</h2>
            <ImageUpload name="coverImage" initial={p?.coverImage} />
            <TextField label="Opis slike (alt)" name="coverAlt" defaultValue={p?.coverAlt} hint="Za slabovidne i tražilice." />
          </div>
          <div className="card grid gap-4 p-5">
            <h2 className="text-lg font-extrabold">SEO</h2>
            <TextField label="Adresa (slug)" name="slug" defaultValue={p?.slug} hint="Prazno = iz naslova." />
            <TextField label="SEO naslov" name="seoTitle" maxLength={70} defaultValue={p?.seoTitle} hint="Do 60–70 znakova." />
            <TextArea label="SEO opis" name="seoDescription" rows={3} maxLength={170} defaultValue={p?.seoDescription} hint="Do 160 znakova." />
          </div>
        </div>
      </form>
      {p && (
        <form action={deletePost} className="mt-6">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message="Trajno obrisati objavu?">Obriši objavu</ConfirmButton>
        </form>
      )}
    </>
  );
}
