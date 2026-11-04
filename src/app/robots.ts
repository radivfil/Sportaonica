import type { MetadataRoute } from "next";
import { SITE_URL, STATIC_DEMO } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (STATIC_DEMO) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/otkazivanje/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
