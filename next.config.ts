import type { NextConfig } from "next";

/**
 * Security headers for every response, including static assets (which skip
 * the middleware). The middleware adds the per-request nonce-based CSP.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const supabaseHost = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : "*.supabase.co";
  } catch {
    return "*.supabase.co";
  }
})();

// Static design preview for GitHub Pages: npm run build:pages (scripts/build-pages.mjs)
const staticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: staticDemo,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: staticDemo, // no image optimiser on a static host
    // Supabase Storage (public bucket "uploads")
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

// Local `next dev` with Cloudflare bindings (only when the adapter is installed).
if (process.env.NODE_ENV === "development" && process.env.CF_DEV === "1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev()).catch(() => undefined);
}
