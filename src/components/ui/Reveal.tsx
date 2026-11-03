"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-reveal without hiding content from crawlers / no-JS users:
 * the hidden state only applies when <html> has the `js` class (set by an
 * inline script in the root layout). Respects prefers-reduced-motion via CSS.
 */
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer?.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -40px 0px", threshold: 0.05 },
  );
  return observer;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: "div" | "li" | "article" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (!el) return;
    if (!io) {
      el.classList.add("is-visible");
      return;
    }
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </Tag>
  );
}
