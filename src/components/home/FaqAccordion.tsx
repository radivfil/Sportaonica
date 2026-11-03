"use client";

import { useId, useState } from "react";
import type { FaqItem } from "@/lib/data/types";
import { Icon } from "@/components/ui/Icon";

/**
 * WAI-ARIA accordion (button + region). Answers stay in the DOM (good for SEO),
 * collapsed panels are `inert` so they are skipped by keyboard and screen readers.
 * Smooth height animation via the grid-template-rows 0fr → 1fr technique.
 */
export function FaqAccordion({ items, headingLevel = "h3" }: { items: FaqItem[]; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  const base = useId();
  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const isOpen = open === item.id;
        const btnId = `${base}-${item.id}-btn`;
        const panelId = `${base}-${item.id}-panel`;
        return (
          <div key={item.id} className={`rounded-3xl bg-white shadow-soft ring-2 transition-colors ${isOpen ? "ring-teal-300" : "ring-transparent"}`}>
            <H className="font-sans text-base">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex min-h-[60px] w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left text-[1.08rem] font-extrabold text-ink sm:px-6"
              >
                {item.question}
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-teal-200" : "bg-pink-100"}`}>
                  <Icon name="chevron-down" className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
            </H>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 leading-relaxed text-ink-soft sm:px-6">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
