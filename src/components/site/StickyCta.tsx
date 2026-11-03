"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/** Thumb-friendly bottom bar on mobile: call + register. */
export function StickyCta({ telHref }: { telHref: string }) {
  const pathname = usePathname();
  const onBooking = pathname.startsWith("/upisi");
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-3 pt-2.5 shadow-[0_-8px_24px_-12px_rgba(19,56,90,0.25)] backdrop-blur pb-safe lg:hidden">
      <div className="mx-auto mb-2.5 flex max-w-md gap-2.5">
        <a href={telHref} className="btn-secondary !min-h-[52px] flex-1 !px-3">
          <Icon name="phone" /> Nazovi
        </a>
        {onBooking ? (
          <a href="#prijava" className="btn-primary !min-h-[52px] flex-[1.6] !px-3">
            Na obrazac <Icon name="arrow-right" />
          </a>
        ) : (
          <Link href="/upisi" className="btn-primary !min-h-[52px] flex-[1.6] !px-3">
            Prijavi dijete <Icon name="arrow-right" />
          </Link>
        )}
      </div>
    </div>
  );
}
