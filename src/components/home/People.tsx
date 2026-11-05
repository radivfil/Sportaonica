import Image from "next/image";
import type { Person } from "@/lib/data/types";
import girlWave from "../../../public/illustrations/girl-wave.png";
import { Icon } from "@/components/ui/Icon";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Star, Whistle } from "@/components/ui/Doodles";
import { asset } from "@/lib/site";

/** Owner & trainers, fully editable in Admin → Sadržaj → O nama. */
export function People({ people, headingLevel = "h2" }: { people: Person[]; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <ul className="grid gap-16">
      {people.map((p, i) => (
        <li key={p.id} className={`grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div className="relative mx-auto w-full max-w-xs">
            <div aria-hidden="true" className={`absolute inset-0 rounded-[3rem] sm:-inset-4 ${i % 2 ? "-rotate-3 bg-pink-200" : "rotate-3 bg-teal-200"}`} />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.75rem] bg-pink-100 shadow-lift ring-8 ring-white">
              {p.photo ? (
                <Image src={asset(p.photo)} alt={p.photoAlt || `${p.name}, ${p.role}`} fill sizes="(max-width: 1024px) 80vw, 320px" className="object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-end bg-gradient-to-b from-pink-100 to-butter-100 p-6 text-center">
                  <Image src={girlWave} alt="" sizes="240px" className="w-3/4 opacity-90" />
                  <p className="mt-3 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-ink-soft">Fotografija: dodati u adminu</p>
                </div>
              )}
            </div>
            {i === 0 ? <Whistle className="absolute -top-6 right-0 w-16 rotate-12 sm:-right-6" /> : <Star className="absolute -bottom-5 left-0 w-12 sm:-left-5" />}
          </div>
          <div className="min-w-0">
            <p className="eyebrow">{p.role}</p>
            <H className="mt-4 text-3xl font-extrabold [overflow-wrap:anywhere] sm:text-4xl">
              {p.name} <DemoBadge className="align-middle" label="Potvrditi" />
            </H>
            <div className="mt-5 grid gap-4 text-lg leading-relaxed text-ink-soft">
              {p.bio.split(/\n\s*\n/).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
            {p.highlights.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {p.highlights.map((h) => (
                  <li key={h} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-ink shadow-soft">
                    <Icon name="check" className="h-5 w-5 text-teal-700" /> {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
