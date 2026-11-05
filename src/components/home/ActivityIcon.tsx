import type { ActivityColor, ActivityIcon as IconKind } from "@/lib/data/types";

export const COLOR_CLASSES: Record<ActivityColor, { bg: string; soft: string; ring: string; fill: string; text: string }> = {
  pink: { bg: "bg-pink-200", soft: "bg-pink-50", ring: "ring-pink-300", fill: "#F2ACA4", text: "text-pink-700" },
  teal: { bg: "bg-teal-200", soft: "bg-teal-50", ring: "ring-teal-300", fill: "#91D2CE", text: "text-teal-700" },
  butter: { bg: "bg-butter-200", soft: "bg-butter-50", ring: "ring-butter-300", fill: "#EFE08A", text: "text-ink" },
  sky: { bg: "bg-sky-200", soft: "bg-sky-50", ring: "ring-sky-300", fill: "#9CCFE3", text: "text-sky-700" },
};

const S = "#2A2F3A";

/** Hand-drawn activity illustrations (inline SVG). */
export function ActivityIcon({ icon, color, className = "h-20 w-20" }: { icon: IconKind; color: ActivityColor; className?: string }) {
  const fill = COLOR_CLASSES[color].fill;
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <circle cx="48" cy="50" r="40" fill="#fff" />
      {icon === "universal" && (
        <>
          <path d="M28 70l10-26h20l10 26z" fill={fill} stroke={S} strokeWidth="2.6" strokeLinejoin="round" />
          <circle cx="36" cy="30" r="9" fill="#F7EFB5" stroke={S} strokeWidth="2.6" />
          <path d="M58 22l4 8 9 1-6 6 1 9-8-4-8 4 1-9-6-6 9-1z" fill="#F2ACA4" stroke={S} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M22 76h52" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      {icon === "handball" && (
        <>
          <rect x="18" y="24" width="60" height="40" rx="3" fill="none" stroke={S} strokeWidth="2.6" />
          <path d="M18 34h60M18 44h60M18 54h60M30 24v40M42 24v40M54 24v40M66 24v40" stroke={S} strokeWidth="1" opacity=".35" />
          <circle cx="56" cy="64" r="13" fill={fill} stroke={S} strokeWidth="2.6" />
          <path d="M45 58c6 2 16 2 22 0M50 52c2 6 2 18-1 24M62 53c-2 6-2 17 1 22" fill="none" stroke={S} strokeWidth="2" />
          <path d="M14 24v44m68-44v44" stroke={S} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {icon === "ball" && (
        <>
          <circle cx="48" cy="48" r="22" fill="#fff" stroke={S} strokeWidth="2.6" />
          <path d="M48 26c-8 7-10 15-9 22s4 15 9 22c-10-2-18-10-20-21C26 37 36 27 48 26z" fill={fill} />
          <path d="M48 26c8 5 11 13 11 22s-3 17-11 22c12-1 20-10 21-22 0-12-9-21-21-22z" fill="#91D2CE" />
          <circle cx="48" cy="48" r="22" fill="none" stroke={S} strokeWidth="2.6" />
          <path d="M20 80c8-3 48-3 56 0" stroke={S} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M74 22l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#F7EFB5" stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )}
      {icon === "obstacle" && (
        <>
          <path d="M16 70c6-14 14-14 20 0" fill="none" stroke={S} strokeWidth="2.6" />
          <rect x="40" y="52" width="22" height="18" rx="4" fill={fill} stroke={S} strokeWidth="2.6" />
          <path d="M66 70V40m14 30V40m-14 8h14m-14 10h14" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M20 40l4-10 4 10" fill="#F9B98E" stroke={S} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M42 34h18" stroke={S} strokeWidth="5" strokeLinecap="round" />
          <path d="M44 34v14m14-14v14" stroke={S} strokeWidth="2.4" />
          <path d="M12 72h72" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      {icon === "toddler" && (
        <>
          {/* big hand holding a small hand + small ball */}
          <circle cx="36" cy="30" r="9" fill="#F9D3B4" stroke={S} strokeWidth="2.6" />
          <circle cx="60" cy="42" r="6.5" fill="#F9D3B4" stroke={S} strokeWidth="2.4" />
          <path d="M36 39v20m0-14 14 4m10-1v12" stroke={S} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M28 76l8-17 8 17M54 76l6-12 6 12" stroke={S} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          <circle cx="72" cy="68" r="7" fill={fill} stroke={S} strokeWidth="2.4" />
          <path d="M18 78h62" stroke={S} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {icon === "skates" && (
        <>
          <path d="M26 30h18v22h18c6 0 10 4 10 10H26z" fill={fill} stroke={S} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M30 38h10M30 45h10" stroke={S} strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="70" r="5" fill="#fff" stroke={S} strokeWidth="2.4" />
          <circle cx="49" cy="70" r="5" fill="#fff" stroke={S} strokeWidth="2.4" />
          <circle cx="65" cy="70" r="5" fill="#fff" stroke={S} strokeWidth="2.4" />
          <path d="M70 26l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#F7EFB5" stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )}
      {icon === "pilates" && (
        <>
          <rect x="14" y="66" width="68" height="8" rx="4" fill={fill} stroke={S} strokeWidth="2.4" />
          <circle cx="30" cy="48" r="7" fill="#F9D3B4" stroke={S} strokeWidth="2.6" />
          <path d="M36 54l20 6 18-26M56 60l4 6" stroke={S} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M64 22c4 2 6 6 4 10" stroke={S} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}
      {icon === "functional" && (
        <>
          <path d="M30 56h36" stroke={S} strokeWidth="4" strokeLinecap="round" />
          <rect x="18" y="44" width="10" height="24" rx="3" fill={fill} stroke={S} strokeWidth="2.6" />
          <rect x="68" y="44" width="10" height="24" rx="3" fill={fill} stroke={S} strokeWidth="2.6" />
          <path d="M40 30c0-6 16-6 16 0v6H40z" fill="#91D2CE" stroke={S} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M48 24v-4" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M18 78h60" stroke={S} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {icon === "workshop" && (
        <>
          <rect x="20" y="24" width="56" height="38" rx="5" fill="#fff" stroke={S} strokeWidth="2.6" />
          <path d="M28 36h28M28 46h40M28 54h20" stroke={S} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M48 62v12m-10 0h20" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="68" cy="34" r="6" fill={fill} stroke={S} strokeWidth="2.2" />
        </>
      )}
    </svg>
  );
}
