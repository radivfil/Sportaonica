import { Breadcrumbs } from "./Breadcrumbs";
import { Blob, Sparkle, Star } from "@/components/ui/Doodles";
import { Squiggle } from "@/components/ui/Doodles";

export function PageHero({ title, intro, crumbs, children }: { title: string; intro?: React.ReactNode; crumbs: { name: string; path: string }[]; children?: React.ReactNode }) {
  return (
    <section className="relative -mt-[68px] overflow-hidden bg-flyer pb-14 pt-[100px] lg:-mt-[76px] lg:pt-[120px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Blob className="absolute -right-20 -top-10 w-72 opacity-60" fill="#BFE7E4" variant={1} />
        <Blob className="absolute -left-24 bottom-0 w-64 opacity-60" fill="#FBCFD6" variant={2} />
        <Star className="absolute right-[12%] top-[45%] hidden w-9 animate-wiggle sm:block" />
        <Sparkle className="absolute left-[45%] top-[30%] hidden w-6 animate-float md:block" fill="#F2ACA4" />
      </div>
      <div className="container relative">
        <Breadcrumbs items={crumbs} />
        <h1 className="max-w-3xl text-4xl font-extrabold sm:text-5xl lg:text-6xl">{title}</h1>
        <Squiggle className="mt-3 h-3 w-28" color="#F2ACA4" />
        {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
