/**
 * Hand-drawn style doodles in the flyer's spirit (wobbly dark outline +
 * flat pastel fills). Pure inline SVG, decorative only (aria-hidden).
 */
type P = { className?: string; style?: React.CSSProperties };
const stroke = "#2A2F3A";

export function BeachBall({ className, style }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="#fff" />
      <path d="M32 5c-9 8-12 17-11 27 1 10 5 19 11 27-11-2-22-12-24-25C6 20 17 7 32 5z" fill="#F2ACA4" />
      <path d="M32 5c9 6 13 15 13 26s-4 21-13 28c14-1 25-12 26-26C59 18 47 6 32 5z" fill="#91D2CE" />
      <path d="M21 32c1 10 5 19 11 27 6-7 13-17 13-28" fill="#F7EFB5" />
      <circle cx="32" cy="32" r="27" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M32 5c-9 8-12 17-11 27s5 19 11 27M32 5c9 6 13 15 13 26s-4 21-13 28" fill="none" stroke={stroke} strokeWidth="2" />
      <ellipse cx="22" cy="17" rx="5" ry="3" fill="#fff" opacity=".7" transform="rotate(-30 22 17)" />
    </svg>
  );
}

export function SoccerBall({ className, style }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <path d="m32 21 9 6.5-3.4 10.5H26.4L23 27.5z" fill="#E86A5E" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 21v-9m9 15.5 9-3m-12.4 13.5 5.5 8m-16.7-8-5.5 8M23 27.5l-9-3" stroke={stroke} strokeWidth="2" />
      <path d="M26 7.5 32 12l6-4.5M54 21l-4 3.5 1.5 9M48 50l-4.9-4H35M16 50l4.9-4H29M10 21l4 3.5-1.5 9" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function Star({ className, style, fill = "#F7E58A" }: P & { fill?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} aria-hidden="true">
      <path
        d="M24 4.5c1.6 0 6 10.6 6.6 11.3.7.6 12.6 1.4 13 3s-8.6 9.3-8.9 10.2c-.3.8 2.8 12.4 1.6 13.4-1.3 1-11.4-5.4-12.3-5.4s-11 6.4-12.3 5.4c-1.2-1 1.9-12.6 1.6-13.4-.3-.9-9.3-8.6-8.9-10.2s12.3-2.4 13-3C18 15.1 22.4 4.5 24 4.5z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className, style, fill = "#91D2CE" }: P & { fill?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <path d="M20 3c1.2 8.6 4.8 12.4 15 17-10.2 4.6-13.8 8.4-15 17-1.2-8.6-4.8-12.4-15-17 10.2-4.6 13.8-8.4 15-17z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function Heart({ className, style, fill = "#F2ACA4" }: P & { fill?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <path d="M20 34S5 25.5 5 14.8A7.8 7.8 0 0 1 20 11a7.8 7.8 0 0 1 15 3.8C35 25.5 20 34 20 34z" fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Sneaker({ className, style }: P) {
  return (
    <svg viewBox="0 0 80 48" className={className} style={style} aria-hidden="true">
      <path d="M6 30c0-8 3-18 8-20 4-1 6 4 12 5 8 1 10-6 14-5 3 1 4 8 10 11 7 3 18 2 22 8 2 3 1 8-2 9H10c-3 0-4-3-4-8z" fill="#9CCFE3" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M6 33h66" stroke={stroke} strokeWidth="2.4" />
      <path d="M6 33c0 4 1 6 4 6h59c3 0 4-2 3-6" fill="#fff" stroke={stroke} strokeWidth="2.4" />
      <path d="M30 17l4 6m2-8 4 6m2-6 3 5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 22c4 1 7 0 9-2" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Cone({ className, style }: P) {
  return (
    <svg viewBox="0 0 48 56" className={className} style={style} aria-hidden="true">
      <path d="M19 6c2-3 8-3 10 0l12 40H7z" fill="#F9B98E" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M14.5 22h19l3 10h-25z" fill="#fff" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <rect x="3" y="45" width="42" height="7" rx="3" fill="#F2ACA4" stroke={stroke} strokeWidth="2.4" />
    </svg>
  );
}

export function Squiggle({ className, style, color = "#C2453D" }: P & { color?: string }) {
  return (
    <svg viewBox="0 0 220 24" className={className} style={style} aria-hidden="true" preserveAspectRatio="none">
      <path d="M4 15c18-10 30 8 48-1s28-9 46 0 30 9 48 0 30-9 46 0 16 3 24-2" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Whistle({ className, style }: P) {
  return (
    <svg viewBox="0 0 64 48" className={className} style={style} aria-hidden="true">
      <path d="M10 22a14 14 0 1 0 27 5h18c3 0 5-2 5-5v-6c0-2-2-4-4-4H24a14 14 0 0 0-14 10z" fill="#F7EFB5" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="23" cy="27" r="5" fill="#fff" stroke={stroke} strokeWidth="2" />
      <path d="M8 12c-3-3-4-7-2-9" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Soft organic background blob (no outline). */
export function Blob({ className, style, fill = "#FBCFD6", variant = 0 }: P & { fill?: string; variant?: 0 | 1 | 2 }) {
  const d = [
    "M64 6c26 0 52 14 58 40s-6 58-36 70-70 2-80-26S4 36 20 20 40 6 64 6z",
    "M70 4c30 3 54 26 52 56s-28 60-62 60S2 96 4 62 40 1 70 4z",
    "M58 8c24-6 56 6 64 32s-4 52-24 66-60 16-80-4S0 50 14 30 34 14 58 8z",
  ][variant];
  return (
    <svg viewBox="0 0 128 128" className={className} style={style} aria-hidden="true">
      <path d={d} fill={fill} />
    </svg>
  );
}
