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

/** Show small "DEMO" markers on placeholder content (turn off for production). */
export const SHOW_DEMO_BADGES = process.env.NEXT_PUBLIC_DEMO_BADGES !== "0";
