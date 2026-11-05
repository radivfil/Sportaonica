import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCAL_SESSION_COOKIE, verifySession } from "@/lib/auth/local-session";

/**
 * Runs on every page/API request:
 *  1. CSRF: POST/PUT/PATCH/DELETE must come from our own origin (cron uses GET + secret).
 *  2. Admin gate: /admin/** and /api/admin/** require a session with completed 2FA.
 *     (Every admin page/action/API checks again server-side — defence in depth.)
 *  3. Security headers incl. a per-request nonce-based Content-Security-Policy.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || new URL(origin).host !== host) {
      return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const csp = buildCsp(nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let res = NextResponse.next({ request: { headers: requestHeaders } });

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isLoginFlow = pathname.startsWith("/admin/prijava");
  if (isAdminArea) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    let ok = false;
    if (supabaseUrl && anonKey) {
      const sb = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list) => {
            for (const { name, value } of list) req.cookies.set(name, value);
            res = NextResponse.next({ request: { headers: requestHeaders } });
            for (const { name, value, options } of list) res.cookies.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: "lax" });
          },
        },
      });
      const { data } = await sb.auth.getUser(); // refreshes the access token if needed
      if (data.user) {
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        ok = aal?.currentLevel === "aal2";
      }
    } else {
      ok = !!(await verifySession(req.cookies.get(LOCAL_SESSION_COOKIE)?.value))?.mfa;
    }
    if (!ok && !isLoginFlow) {
      if (pathname.startsWith("/api/")) return withHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), csp);
      const url = req.nextUrl.clone();
      url.pathname = "/admin/prijava";
      url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
      return withHeaders(NextResponse.redirect(url), csp);
    }
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
  }

  return withHeaders(res, csp);
}

function buildCsp(nonce: string) {
  const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`.trim(),
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function withHeaders(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return res;
}

export const config = {
  matcher: [
    // everything except static files and image optimisation
    { source: "/((?!_next/static|_next/image|favicon|icon|apple-icon|brand/|gallery/|illustrations/|robots.txt|sitemap.xml|manifest).*)" },
  ],
};
