/** Static site-level constants. Editable contact data lives in SiteSettings (admin). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Sportaonica";
export const SLOGAN = "Sport koji gradi zdrave navike za cijeli život!";
export const DEFAULT_DESCRIPTION =
  "Sportaonica — program sportskih aktivnosti za djecu od 3 do 10 godina, verificiran od Ministarstva znanosti, obrazovanja i mladih. Univerzalna sportska škola u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu.";
export const AGE_RANGE = { min: 3, max: 10 };

export const NAV = [
  { href: "/aktivnosti", label: "Aktivnosti" },
  { href: "/upisi", label: "Termini i upisi" },
  { href: "/lokacije", label: "Lokacije" },
  { href: "/o-nama", label: "O nama" },
  { href: "/novosti", label: "Novosti" },
  { href: "/galerija", label: "Galerija" },
  { href: "/cesta-pitanja", label: "Pitanja" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

/**
 * Static preview build (GitHub Pages): no server, so forms are simulated and
 * the admin is unavailable. Enabled with NEXT_PUBLIC_STATIC_DEMO=1.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
/** URL prefix when hosted in a sub-folder (e.g. /Sportaonica on GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Prefix a /public asset path with BASE_PATH (next/image does not do this for string src). */
export const asset = (src: string | undefined) => (src && src.startsWith("/") && !src.startsWith(BASE_PATH + "/") ? `${BASE_PATH}${src}` : src ?? "");

/** Show small "DEMO" markers on placeholder content (turn off for production). */
export const SHOW_DEMO_BADGES = process.env.NEXT_PUBLIC_DEMO_BADGES !== "0";
