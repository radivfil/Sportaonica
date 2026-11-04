import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BASE_PATH, DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, SLOGAN, STATIC_DEMO } from "@/lib/site";

/**
 * Self-hosted variable fonts (SIL OFL), subset to Latin + Croatian letters
 * (č ć đ š ž) and typographic punctuation — see docs/design-brief.md.
 * One small file per family keeps fonts off the LCP critical path.
 */
const display = localFont({
  src: "../assets/fonts/Baloo2-Sportaonica.woff2",
  weight: "600 800",
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-rounded", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});
const body = localFont({
  src: "../assets/fonts/NunitoSans-Sportaonica.woff2",
  weight: "400 800",
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — sportska škola za djecu | Božjakovina, Brckovljani, Sesvetski Kraljevec`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "sportska škola za djecu",
    "univerzalna sportska škola",
    "sport za djecu Brckovljani",
    "sport za djecu Božjakovina",
    "Sesvetski Kraljevec",
    "sportske aktivnosti za predškolce",
    "mini rukomet",
  ],
  openGraph: {
    type: "website",
    locale: "hr_HR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SLOGAN}`, description: DEFAULT_DESCRIPTION },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
  icons: { icon: [{ url: `${BASE_PATH}/icon.svg`, type: "image/svg+xml" }], apple: `${BASE_PATH}/apple-icon.png` },
  // the static preview must not compete with the real site in search results
  ...(STATIC_DEMO ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#FCE8FB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* enables JS-only reveal animations; content stays visible without JS */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
