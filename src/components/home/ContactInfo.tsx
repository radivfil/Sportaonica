import type { SiteSettings } from "@/lib/data/types";
import { telHref } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export function ContactInfo({ settings }: { settings: SiteSettings }) {
  const items = [
    { href: telHref(settings.phone), icon: "phone" as const, label: "Nazovite nas", value: settings.phone, bg: "bg-pink-100" },
    { href: `mailto:${settings.email}`, icon: "mail" as const, label: "Pišite nam", value: settings.email, bg: "bg-teal-100" },
    { href: settings.instagramUrl, icon: "instagram" as const, label: "Instagram", value: "Pratite nas", bg: "bg-butter-100", external: true },
    { href: settings.facebookUrl, icon: "facebook" as const, label: "Facebook", value: "Pridružite se", bg: "bg-sky-100", external: true },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((it) => (
        <li key={it.label}>
          <a
            href={it.href}
            {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`lift flex min-h-[76px] items-center gap-4 rounded-3xl ${it.bg} p-4 ring-1 ring-ink/5`}
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-navy shadow-soft">
              <Icon name={it.icon} className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink-soft">{it.label}</span>
              <span className="block break-all font-display text-xl font-extrabold leading-tight text-ink">{it.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
