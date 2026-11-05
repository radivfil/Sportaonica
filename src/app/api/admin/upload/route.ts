import { NextResponse } from "next/server";
import { adminRepo } from "@/lib/data";
import { detectImage, readImageSize } from "@/lib/image-check";

export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024;
const MAX_FILES = 20;

/** Admin image upload (one or more files). Type checked by magic bytes, max 5 MB each. */
export async function POST(req: Request) {
  const repo = await adminRepo();
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "Nije odabrana datoteka." }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Najviše ${MAX_FILES} slika odjednom.` }, { status: 400 });
  const out: { url: string; width: number; height: number; name: string }[] = [];
  for (const file of files) {
    if (file.size > MAX) return NextResponse.json({ error: `„${file.name}” je veća od 5 MB.` }, { status: 413 });
    const data = new Uint8Array(await file.arrayBuffer());
    const kind = detectImage(data); // don't trust the browser-supplied type
    if (!kind) return NextResponse.json({ error: `„${file.name}” nije JPG, PNG ni WebP slika.` }, { status: 415 });
    const size = readImageSize(data, kind) ?? { width: 1200, height: 900 };
    const url = await repo.saveUpload({ name: `upload.${kind.ext}`, contentType: kind.mime, data });
    out.push({ url, ...size, name: file.name });
  }
  return NextResponse.json({ files: out, url: out[0].url });
}
