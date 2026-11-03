import Image from "next/image";
import Link from "next/link";
import kidsGroup from "../../../public/illustrations/kids-group.png";
import logo from "../../../public/brand/logo.png";
import { BeachBall, Blob, Heart, Sneaker, SoccerBall, Sparkle, Squiggle, Star } from "@/components/ui/Doodles";
import { Icon } from "@/components/ui/Icon";
import { Counter } from "@/components/ui/Counter";
import { AGE_RANGE } from "@/lib/site";

export function Hero({ locationsCount }: { locationsCount: number }) {
  return (
    <section aria-labelledby="hero-title" className="relative -mt-[68px] overflow-hidden bg-flyer pt-[68px] lg:-mt-[76px] lg:pt-[76px]">
      {/* decorative, CSS-only animation (respects prefers-reduced-motion via globals.css) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Blob className="absolute -left-24 top-10 w-72 opacity-70 sm:w-96" fill="#FBCFD6" variant={0} />
        <Blob className="absolute -right-28 top-1/3 w-80 opacity-60 sm:w-[28rem]" fill="#BFE7E4" variant={1} />
        <Blob className="absolute -bottom-32 -left-10 w-72 opacity-70" fill="#FFF6CC" variant={2} />
        <div className="absolute inset-x-0 top-0 h-2/3 bg-dots opacity-50" />
        <Star className="absolute left-[6%] top-[22%] hidden w-9 animate-wiggle sm:block" />
        <Sparkle className="absolute right-[8%] top-[16%] w-7 animate-float-slow" fill="#F2ACA4" />
        <Heart className="absolute bottom-[18%] left-[3%] w-8 animate-float" fill="#F2ACA4" />
        <Sneaker className="absolute bottom-[10%] right-[4%] hidden w-20 -rotate-12 animate-float-slow lg:block" />
      </div>

      <div className="container relative grid items-center gap-10 pb-20 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28 lg:pt-16">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <Icon name="shield" className="h-4 w-4 text-teal-700" />
            Verificirano od Ministarstva znanosti, obrazovanja i mladih
          </p>

          <h1 id="hero-title" className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
            Sport koji gradi{" "}
            <span className="relative inline-block whitespace-nowrap text-coral-700">
              zdrave navike
              <Squiggle className="absolute -bottom-2 left-0 h-3 w-full sm:h-4" color="#F2ACA4" />
            </span>{" "}
            za cijeli život!
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Program sportskih aktivnosti za djecu od {AGE_RANGE.min} do {AGE_RANGE.max} godina. Kroz igru razvijamo motoriku, snagu,
            koncentraciju i prijateljstva — u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/upisi" className="btn-primary !min-h-[56px] !px-8 !text-lg">
              Prijavi dijete <Icon name="arrow-right" />
            </Link>
            <Link href="/upisi#raspored" className="btn-secondary !min-h-[56px] !px-8 !text-lg">
              <Icon name="calendar" /> Pogledaj termine
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[
              { value: <><Counter to={AGE_RANGE.min} />–<Counter to={AGE_RANGE.max} /></>, label: "godina", bg: "bg-pink-100" },
              { value: <Counter to={locationsCount} />, label: locationsCount === 1 ? "lokacija" : "lokacije", bg: "bg-teal-100" },
              { value: <Counter to={4} />, label: "područja razvoja", bg: "bg-butter-100" },
            ].map((s) => (
              <div key={s.label} className={`rounded-3xl ${s.bg} px-3 py-4 text-center ring-1 ring-ink/5`}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-extrabold leading-none text-navy sm:text-4xl">{s.value}</dd>
                <dd className="mt-1 text-xs font-bold leading-tight text-ink-soft sm:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div aria-hidden="true" className="absolute inset-x-6 top-10 bottom-6 rounded-[42%_58%_55%_45%/52%_45%_55%_48%] bg-white/70 shadow-soft" />
          <Image
            src={kidsGroup}
            alt="Ilustracija veselih djece koja trče i skaču"
            priority
            sizes="(max-width: 1024px) 90vw, 540px"
            className="relative mx-auto w-[92%] drop-shadow-[0_18px_24px_rgba(19,56,90,0.18)]"
          />
          <div className="relative -mt-4 flex justify-center">
            <div className="relative">
              <div aria-hidden="true" className="absolute -inset-x-6 -inset-y-4 flex">
                <span className="flex-1 rounded-[45%] bg-butter-200" />
                <span className="-mx-6 flex-[1.4] rounded-[48%] bg-pink-300" />
                <span className="flex-1 rounded-[45%] bg-teal-300" />
              </div>
              <Image src={logo} alt="" sizes="360px" className="relative w-[300px] sm:w-[360px]" />
            </div>
          </div>
          <BeachBall className="absolute -left-2 top-4 w-14 animate-float sm:w-16" />
          <SoccerBall className="absolute -right-1 bottom-24 w-12 animate-spin-slow sm:w-14" />
        </div>
      </div>
    </section>
  );
}
