import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, SLOGAN } from "@/lib/site";

const display = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const body = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
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
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-icon.png" },
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
