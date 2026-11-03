import { BeachBall } from "./Doodles";

export function BallLoader({ label = "Učitavanje…", className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex h-24 w-16 items-end justify-center">
        <BeachBall className="relative z-10 h-12 w-12 animate-bounce-ball" />
        <span className="absolute bottom-0 h-2 w-10 rounded-full bg-ink/40 animate-shadow-pulse" />
      </div>
      <span className="text-sm font-bold text-ink-soft">{label}</span>
    </div>
  );
}
