import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { TrainerBlock } from "@/components/home/TrainerBlock";
import { Benefits } from "@/components/home/Benefits";
import { CtaBand } from "@/components/home/CtaBand";
import { Icon } from "@/components/ui/Icon";
import { getContent, getSettings } from "@/lib/queries";
import { telHref } from "@/lib/format";

export const metadata: Metadata = {
  title: "O nama i treneru",
  description: "Sportaonicu vodi profesor kineziologije i rukometni trener. Program je verificiran od Ministarstva znanosti, obrazovanja i mladih.",
  alternates: { canonical: "/o-nama" },
};

export default async function AboutPage() {
  const [content, settings] = await Promise.all([getContent(), getSettings()]);
  return (
    <>
      <PageHero title="O nama" intro="Sport koji gradi zdrave navike za cijeli život — to nam je misija na svakom treningu." crumbs={[{ name: "O nama", path: "/o-nama" }]} />
      <section aria-labelledby="trainer-title" className="container py-16 sm:py-20">
        <TrainerBlock trainer={content.trainer} />
      </section>
      <section className="container pb-8">
        <div className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-teal-100 p-8 text-center sm:flex-row sm:text-left">
          <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-soft">
            <Icon name="shield" className="h-10 w-10 text-teal-700" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold">Verificiran program</h2>
            <p className="mt-2 text-lg text-ink">
              Program sportskih aktivnosti Sportaonica verificiran je od strane Ministarstva znanosti, obrazovanja i mladih.
            </p>
          </div>
        </div>
      </section>
      <Benefits />
      <CtaBand telHref={telHref(settings.phone)} phone={settings.phone} />
    </>
  );
}
