import { NextResponse } from "next/server";
import { repo } from "@/lib/data";
import { isAdmin } from "@/lib/admin-guard";

const MAX = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nije odabrana datoteka." }, { status: 400 });
  if (!TYPES[file.type]) return NextResponse.json({ error: "Dopušteni formati: JPG, PNG, WebP." }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: "Slika je veća od 5 MB." }, { status: 413 });
  const data = Buffer.from(await file.arrayBuffer());
  // magic-byte check (don't trust the browser-supplied type)
  const sig = data.subarray(0, 12);
  const ok =
    (sig[0] === 0xff && sig[1] === 0xd8) ||
    (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47) ||
    (sig.toString("ascii", 0, 4) === "RIFF" && sig.toString("ascii", 8, 12) === "WEBP");
  if (!ok) return NextResponse.json({ error: "Datoteka nije ispravna slika." }, { status: 415 });
  const url = await repo().saveUpload({ name: `upload${TYPES[file.type]}`, contentType: file.type, data });
  return NextResponse.json({ url });
}
