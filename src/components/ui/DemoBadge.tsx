import { SHOW_DEMO_MARKER } from "@/lib/env";

/** Small marker on placeholder content (hidden when NEXT_PUBLIC_APP_ENV=production). */
export function DemoBadge({ label = "Demo podatak", className = "" }: { label?: string; className?: string }) {
  if (!SHOW_DEMO_MARKER) return null;
  return (
    <span
      title="Placeholder: potvrditi s klijentom"
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-ink/30 bg-white/80 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-ink-soft ${className}`}
    >
      {label}
    </span>
  );
}

/** Discreet "DEMO" label on every page during phase A (fictional data only). */
export function DemoMarker() {
  return (
    <div
      role="note"
      aria-label="Demo verzija stranice s izmišljenim podacima"
      className="no-print pointer-events-none fixed left-0 top-0 z-[60] rounded-br-xl bg-ink/85 px-3 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-white"
    >
      Demo
    </div>
  );
}
