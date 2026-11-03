import Link from "next/link";
import Image from "next/image";
import kid from "../../../public/illustrations/kid-kick.png";
import { Icon } from "@/components/ui/Icon";
import { Star, Sparkle } from "@/components/ui/Doodles";

export function CtaBand({ telHref, phone }: { telHref: string; phone: string }) {
  return (
    <section aria-labelledby="cta-title" className="cv-auto container py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-navy px-6 py-12 text-white sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/30" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-coral/30" />
        <Star className="absolute right-8 top-8 w-10 animate-wiggle" />
        <Sparkle className="absolute bottom-10 left-6 w-7 animate-float" fill="#F7EFB5" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 id="cta-title" className="text-3xl font-extrabold text-white sm:text-4xl">Mjesta u grupama su ograničena</h2>
            <p className="mt-3 max-w-lg text-lg text-white/85">Prijava traje dvije minute. Odaberite termin, a potvrdu dobivate odmah na e-mail.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/upisi" className="btn bg-white !text-navy hover:-translate-y-0.5 hover:bg-butter-50">
                Prijavi dijete <Icon name="arrow-right" />
              </Link>
              <a href={telHref} className="btn border-2 border-white/60 text-white hover:bg-white/10">
                <Icon name="phone" /> {phone}
              </a>
            </div>
          </div>
          <Image src={kid} alt="" sizes="260px" className="mx-auto hidden w-56 drop-shadow-xl md:block" />
        </div>
      </div>
    </section>
  );
}
