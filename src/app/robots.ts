import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SHOW_DEMO_MARKER } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // demo (phase A) must never be indexed
  if (SHOW_DEMO_MARKER) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/otkazivanje/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
