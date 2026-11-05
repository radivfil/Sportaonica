"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "./Logo";

export function Header({ phone, telHref }: { phone: string; telHref: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background,box-shadow] duration-300 ${
        scrolled || open ? "bg-white/95 shadow-[0_6px_24px_-16px_rgba(19,56,90,0.4)] backdrop-blur" : "bg-transparent"
      }`}
    >
      <a href="#sadrzaj" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-bold">
        Preskoči na sadržaj
      </a>
      <div className="container flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
        <Logo className="h-9 w-auto sm:h-11" priority />

        <nav aria-label="Glavna navigacija" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[0.95rem] font-bold transition hover:bg-pink-100 ${
                    isActive(item.href) ? "bg-pink-100 text-navy" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a href={telHref} className="hidden items-center gap-2 rounded-full px-3 py-2 font-bold text-navy hover:bg-white/70 2xl:inline-flex">
            <Icon name="phone" className="h-5 w-5" />
            {phone}
          </a>
          <Link href="/upisi" className="btn-primary hidden !min-h-[44px] !px-5 !py-2 sm:inline-flex">
            Upiši se
          </Link>
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy shadow-soft xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[68px] z-30 overflow-y-auto bg-white px-4 pb-28 pt-4 lg:top-[76px] xl:hidden"
      >
        <nav aria-label="Mobilna navigacija">
          <ul className="grid gap-1">
            {[{ href: "/", label: "Početna" }, ...NAV].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-4 font-display text-xl font-bold text-ink hover:bg-pink-50 aria-[current=page]:bg-pink-100"
                >
                  {item.label}
                  <Icon name="arrow-right" className="h-5 w-5 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 grid gap-3">
          <Link href="/upisi" className="btn-primary w-full">Upiši se</Link>
          <a href={telHref} className="btn-secondary w-full">
            <Icon name="phone" /> Nazovi {phone}
          </a>
        </div>
      </div>
    </header>
  );
}
