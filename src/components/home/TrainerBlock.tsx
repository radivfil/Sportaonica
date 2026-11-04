import Image from "next/image";
import type { TrainerBlock as Trainer } from "@/lib/data/types";
import girlWave from "../../../public/illustrations/girl-wave.png";
import { Icon } from "@/components/ui/Icon";
import { asset } from "@/lib/site";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Star, Whistle } from "@/components/ui/Doodles";

export function TrainerBlock({ trainer }: { trainer: Trainer }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-sm">
        <div aria-hidden="true" className="absolute inset-0 rotate-3 rounded-[3rem] bg-teal-200 sm:-inset-4" />
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2.75rem] bg-pink-100 shadow-lift ring-8 ring-white">
          {trainer.photo ? (
            <Image src={asset(trainer.photo)} alt={`${trainer.name}, ${trainer.title}`} fill sizes="(max-width: 1024px) 90vw, 400px" className="object-cover" />
          ) : (
            // TODO(client): upload trainer photo in Admin → Sadržaj → O treneru
            <div className="flex h-full flex-col items-center justify-end bg-gradient-to-b from-pink-100 to-butter-100 p-6 text-center">
              <Image src={girlWave} alt="" sizes="260px" className="w-3/4 opacity-90" />
              <p className="mt-3 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-ink-soft">Ovdje dolazi fotografija trenera</p>
            </div>
          )}
        </div>
        <Whistle className="absolute -top-6 right-0 w-16 rotate-12 sm:-right-6 sm:w-20" />
        <Star className="absolute -bottom-5 left-0 w-12 sm:-left-5" />
      </div>
      <div>
        <p className="eyebrow">O treneru</p>
        <h2 id="trainer-title" className="mt-4 text-3xl font-extrabold sm:text-4xl">
          {trainer.name} <DemoBadge className="align-middle" label="Ime: potvrditi" />
        </h2>
        <p className="mt-2 text-lg font-bold text-coral-700">{trainer.title}</p>
        <div className="mt-5 grid gap-4 text-lg leading-relaxed text-ink-soft">
          {trainer.bio.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {trainer.highlights.map((h) => (
            <li key={h} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-ink shadow-soft">
              <Icon name="check" className="h-5 w-5 text-teal-700" /> {h}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
