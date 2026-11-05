/** Static site-level constants. Editable contact data lives in SiteSettings (admin). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Sportaonica";
export const SLOGAN = "Sport koji gradi zdrave navike za cijeli život!";
export const DEFAULT_DESCRIPTION =
  "Sportaonica: program sportskih aktivnosti za djecu, verificiran od Ministarstva znanosti, obrazovanja i mladih, te treninzi za odrasle. Brckovljani i Sesvetski Kraljevec. Online upis, slobodna mjesta uživo.";
export const SERVICE_AREA = ["Brckovljani", "Sesvetski Kraljevec", "Dugo Selo", "Sesvete"];

export const NAV = [
  { href: "/aktivnosti", label: "Programi i termini" },
  { href: "/rodendani", label: "Rođendani" },
  { href: "/lokacije", label: "Lokacije" },
  { href: "/o-nama", label: "O nama" },
  { href: "/novosti", label: "Novosti" },
  { href: "/galerija", label: "Galerija" },
  { href: "/cesta-pitanja", label: "Pitanja" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

/**
 * Static design preview on GitHub Pages (`npm run build:pages`): no server,
 * so forms are simulated, server-side filters are hidden and the admin is not published.
 */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
/** URL prefix when hosted in a sub-folder (e.g. /Sportaonica on GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Prefix a /public asset path with BASE_PATH (next/image does not do this for string src when unoptimized). */
export const asset = (src: string | undefined) => (src && src.startsWith("/") && BASE_PATH && !src.startsWith(BASE_PATH + "/") ? `${BASE_PATH}${src}` : (src ?? ""));
