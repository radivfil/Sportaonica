import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Design tokens derived from the Sportaonica flyer.
 * See docs/design-brief.md for rationale and contrast checks.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        ink: { DEFAULT: "#13385A", soft: "#4A5B70", faint: "#6B7A8C" },
        navy: { DEFAULT: "#0F4F7D", 700: "#0B3B5E", 900: "#0A2A44" },
        coral: { DEFAULT: "#C2453D", 600: "#C2453D", 700: "#A83830", 100: "#FDE3E0" },
        pink: { 50: "#FFF5F8", 100: "#FFE4EC", 200: "#FBCFD6", 300: "#F2ACA4", 700: "#A23A33" },
        peach: { 50: "#FFF6EF", 100: "#FFE9DA", 200: "#FDD3B5", 300: "#F9B98E" },
        butter: { 50: "#FFFBEA", 100: "#FFF6CC", 200: "#F7EFB5", 300: "#EFE08A" },
        teal: { 50: "#F1FAF9", 100: "#E3F5F3", 200: "#BFE7E4", 300: "#91D2CE", 500: "#3AA6A0", 700: "#1D6E69" },
        sky: { 50: "#F2F9FD", 100: "#E6F3FA", 200: "#C3E1EC", 300: "#9CCFE3", 700: "#2B6A8E" },
        lilac: { 50: "#FEF4FD", 100: "#FCE8FB", 200: "#F6D3F3" },
        cream: "#FFFCF3",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.75rem" },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(19, 56, 90, 0.18)",
        lift: "0 22px 45px -18px rgba(19, 56, 90, 0.30)",
        sticker: "0 0 0 4px #fff, 0 12px 28px -12px rgba(19, 56, 90, 0.35)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        wiggle: { "0%,100%": { transform: "rotate(-6deg)" }, "50%": { transform: "rotate(6deg)" } },
        bounceBall: {
          "0%,100%": { transform: "translateY(0) scale(1.08,0.92)", animationTimingFunction: "cubic-bezier(0.3,0,0.7,0)" },
          "12%": { transform: "translateY(-4px) scale(0.96,1.04)" },
          "50%": { transform: "translateY(-44px) scale(1,1)", animationTimingFunction: "cubic-bezier(0.3,0,0.7,1)" },
        },
        shadowPulse: { "0%,100%": { transform: "scaleX(1)", opacity: "0.35" }, "50%": { transform: "scaleX(0.5)", opacity: "0.12" } },
        blob: {
          "0%,100%": { borderRadius: "58% 42% 55% 45% / 48% 55% 45% 52%" },
          "50%": { borderRadius: "45% 55% 42% 58% / 55% 45% 58% 42%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out 1.5s infinite",
        "float-slow": "float 9s ease-in-out 1.5s infinite",
        "spin-slow": "spin-slow 24s linear 1.5s infinite",
        wiggle: "wiggle 3s ease-in-out 1.5s infinite",
        "bounce-ball": "bounceBall 0.9s infinite",
        "shadow-pulse": "shadowPulse 0.9s infinite",
        blob: "blob 14s ease-in-out infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
