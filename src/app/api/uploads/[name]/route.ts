import { publicRepo } from "@/lib/data";

/** Local JSON mode only. In Supabase mode images are served by Supabase Storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await publicRepo().getUpload(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.data as BodyInit, {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
