import type { MetadataRoute } from "next";
import { publicRepo } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await publicRepo().listPosts({ status: "published" });
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/aktivnosti", 0.9, "daily"],
    ["/upisi", 0.8, "daily"],
    ["/rodendani", 0.7, "monthly"],
    ["/lokacije", 0.8, "monthly"],
    ["/o-nama", 0.6, "yearly"],
    ["/novosti", 0.6, "weekly"],
    ["/galerija", 0.5, "monthly"],
    ["/cesta-pitanja", 0.6, "monthly"],
    ["/kontakt", 0.6, "yearly"],
    ["/politika-privatnosti", 0.2, "yearly"],
  ];
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, lastModified: now, priority, changeFrequency })),
    ...posts.map((p) => ({ url: `${SITE_URL}/novosti/${p.slug}`, lastModified: new Date(p.updatedAt), priority: 0.5, changeFrequency: "yearly" as const })),
  ];
}
