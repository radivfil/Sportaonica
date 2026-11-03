/** Visual capacity indicator. Colour shifts as the slot fills up. */
export function FillBar({ taken, capacity, className = "" }: { taken: number; capacity: number; className?: string }) {
  const pct = Math.min(100, Math.round((taken / Math.max(capacity, 1)) * 100));
  const color = pct >= 100 ? "bg-coral" : pct >= 80 ? "bg-peach-300" : "bg-teal-500";
  return (
    <div
      role="meter"
      aria-label="Popunjenost termina"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={taken}
      aria-valuetext={`${taken} od ${capacity} mjesta zauzeto`}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <div className={`h-full rounded-full ${color} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}
