"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV = [
  { href: "/admin", label: "Pregled", emoji: "📊" },
  { href: "/admin/prijave", label: "Prijave", emoji: "🧒" },
  { href: "/admin/termini", label: "Termini", emoji: "🗓️" },
  { href: "/admin/aktivnosti", label: "Aktivnosti", emoji: "⚽" },
  { href: "/admin/novosti", label: "Novosti", emoji: "📰" },
  { href: "/admin/sadrzaj", label: "Sadržaj stranice", emoji: "✏️" },
  { href: "/admin/poruke", label: "Poruke", emoji: "✉️" },
  { href: "/admin/postavke", label: "Postavke", emoji: "⚙️" },
];

export function AdminNav({ variant }: { variant: "side" | "top" }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  if (variant === "top") {
    return (
      <nav aria-label="Admin navigacija" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        <ul className="flex gap-2">
          {ADMIN_NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-bold ${
                  active(n.href) ? "bg-navy text-white" : "bg-white text-ink ring-1 ring-ink/10"
                }`}
              >
                <span aria-hidden="true">{n.emoji}</span> {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label="Admin navigacija">
      <ul className="grid gap-1">
        {ADMIN_NAV.map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-[1.05rem] font-bold transition ${
                active(n.href) ? "bg-navy text-white" : "text-ink hover:bg-white"
              }`}
            >
              <span aria-hidden="true" className="text-lg">{n.emoji}</span> {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
