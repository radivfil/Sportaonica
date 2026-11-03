import { SHOW_DEMO_BADGES } from "@/lib/site";

/** Small marker on placeholder content. Disable with NEXT_PUBLIC_DEMO_BADGES=0. */
export function DemoBadge({ label = "Demo podatak", className = "" }: { label?: string; className?: string }) {
  if (!SHOW_DEMO_BADGES) return null;
  return (
    <span
      title="Placeholder — potvrditi s klijentom"
      className={`inline-flex items-center gap-1 rounded-full border border-dashed border-ink/30 bg-white/80 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-ink-soft ${className}`}
    >
      {label}
    </span>
  );
}
