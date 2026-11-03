"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile widget. Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    const tryRender = () => {
      if (rendered.current || !ref.current || !window.turnstile) return false;
      window.turnstile.render(ref.current, { sitekey: SITE_KEY, language: "hr", callback: onToken });
      rendered.current = true;
      return true;
    };
    if (tryRender()) return;
    const t = setInterval(() => tryRender() && clearInterval(t), 300);
    return () => clearInterval(t);
  }, [onToken]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
