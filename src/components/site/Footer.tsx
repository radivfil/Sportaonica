import Link from "next/link";
import type { SiteSettings } from "@/lib/data/types";
import { NAV, STATIC_DEMO } from "@/lib/site";
import { telHref } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Wave } from "@/components/ui/Wave";
import { Logo } from "./Logo";
import { CookieSettingsButton } from "./CookieBanner";

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="cv-auto mt-auto">
      <Wave fill="#0B3B5E" />
      <div className="bg-navy-700 pb-28 pt-12 text-white lg:pb-12">
        <div className="container grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="inline-block rounded-3xl bg-white px-4 py-3">
              <Logo className="h-10 w-auto" />
            </div>
            <p className="mt-4 max-w-xs leading-relaxed text-white/85">
              Program sportskih aktivnosti za djecu. Sport koji gradi zdrave navike za cijeli život!
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
              <Icon name="shield" className="h-4 w-4 text-teal-300" /> Verificirano od MZOM-a
            </p>
          </div>

          <nav aria-label="Poveznice u podnožju">
            <h2 className="font-display text-lg font-bold text-white">Stranice</h2>
            <ul className="mt-2 grid">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="inline-flex min-h-[36px] items-center text-white/85 hover:text-white hover:underline">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-display text-lg font-bold text-white">Kontakt</h2>
            <ul className="mt-3 grid gap-3">
              <li>
                <a href={telHref(settings.phone)} className="inline-flex items-center gap-2 font-bold hover:underline">
                  <Icon name="phone" className="h-5 w-5 text-pink-200" /> {settings.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 break-all hover:underline">
                  <Icon name="mail" className="h-5 w-5 shrink-0 text-pink-200" /> {settings.email}
                </a>
              </li>
              <li className="flex gap-2 pt-1">
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Sportaonica na Instagramu" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <Icon name="instagram" />
                </a>
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Sportaonica na Facebooku" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <Icon name="facebook" />
                </a>
              </li>
            </ul>
          </div>

          <div className="text-sm leading-relaxed text-white/80">
            <h2 className="font-display text-lg font-bold text-white">Podaci obrta</h2>
            <p className="mt-3">
              {settings.business.name}
              <br />
              Vlasnik: {settings.business.owner}
              <br />
              OIB: {settings.business.oib}
              <br />
              {settings.business.address}
            </p>
          </div>
        </div>

        <div className="container mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Sportaonica. Sva prava pridržana.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 [&>*]:inline-flex [&>*]:min-h-[36px] [&>*]:items-center">
            <Link href="/politika-privatnosti" className="hover:text-white hover:underline">Politika privatnosti</Link>
            <CookieSettingsButton className="hover:text-white hover:underline" />
            {!STATIC_DEMO && <Link href="/admin" className="hover:text-white hover:underline">Admin</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
