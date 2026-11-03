/** Wavy section divider. `fill` is the colour of the section BELOW. */
export function Wave({ fill = "#FFFCF3", flip = false, className = "" }: { fill?: string; flip?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative -mb-px leading-[0] ${flip ? "rotate-180" : ""} ${className}`}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="h-[34px] w-full sm:h-[56px]">
        <path d="M0 40c120 26 240 34 360 20S600 6 720 10s240 44 360 46 240-26 360-34v58H0z" fill={fill} />
      </svg>
    </div>
  );
}
