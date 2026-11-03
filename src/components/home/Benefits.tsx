import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The four development areas exactly as listed on the client's flyer.
 * Each card echoes the flyer's paper object: pinned sticky note, spiral
 * notepad, balloon and cloud.
 */
const AREAS = [
  {
    title: "Razvoj kognitivnih vještina",
    items: ["Koncentracija i pažnja", "Brže donošenje odluka", "Prostorna orijentacija", "Koordinacija pokreta i razmišljanja"],
    bg: "bg-sky-100",
    accent: "#9CCFE3",
    deco: "pin",
    icon: (
      <path d="M24 8c-7 0-12 5-12 11 0 4 2 6 4 8 1 1 2 3 2 5h12c0-2 1-4 2-5 2-2 4-4 4-8 0-6-5-11-12-11zM19 36h10M20 40h8" />
    ),
  },
  {
    title: "Razvoj tjelesnih sposobnosti",
    items: ["Snaga", "Izdržljivost", "Fleksibilnost"],
    bg: "bg-pink-100",
    accent: "#F2ACA4",
    deco: "spiral",
    icon: <path d="M8 20v8m4-12v16m0-8h24m0-8v16m4-12v8" />,
  },
  {
    title: "Razvoj motoričkih vještina",
    items: ["Gruba motorika", "Fina motorika", "Ravnoteža", "Koordinacija"],
    bg: "bg-butter-100",
    accent: "#EFE08A",
    deco: "balloon",
    icon: <path d="M24 8a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM24 15v12m0 0-6 12m6-12 6 12M14 22l10-3 10 3" />,
  },
  {
    title: "Socio-emocionalni razvoj",
    items: ["Timski rad i suradnja s drugom djecom", "Razvoj komunikacije", "Učenje pravila i poštivanje drugih"],
    bg: "bg-teal-100",
    accent: "#91D2CE",
    deco: "cloud",
    icon: (
      <path d="M17 14a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm14 0a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM9 36a8 8 0 0 1 16 0m-2 0a8 8 0 0 1 16 0" />
    ),
  },
] as const;

function Deco({ kind, color }: { kind: string; color: string }) {
  if (kind === "pin")
    return (
      <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute -top-4 left-1/2 h-9 w-9 -translate-x-1/2">
        <circle cx="20" cy="16" r="9" fill="#F2ACA4" stroke="#2A2F3A" strokeWidth="2" />
        <circle cx="17" cy="13" r="2.5" fill="#fff" opacity=".8" />
        <path d="M20 25v10" stroke="#2A2F3A" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  if (kind === "spiral")
    return (
      <div aria-hidden="true" className="absolute -top-3.5 left-0 right-0 flex justify-center gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-7 w-3.5 rounded-full border-[2.5px] border-[#2A2F3A] bg-white" />
        ))}
      </div>
    );
  if (kind === "balloon")
    return (
      <svg aria-hidden="true" viewBox="0 0 30 60" className="absolute -bottom-12 left-1/2 h-14 w-8 -translate-x-1/2">
        <path d="M11 2h8l-4 6z" fill={color} stroke="#2A2F3A" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 8c-6 10 6 16 0 26s4 16 0 24" fill="none" stroke="#2A2F3A" strokeWidth="1.8" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 200 30" preserveAspectRatio="none" className="absolute -top-5 left-0 h-7 w-full">
      <path
        d="M0 30c4-14 16-18 26-14 4-12 22-14 30-4 6-10 24-12 32 0 8-10 24-10 30 2 8-10 26-8 30 4 10-8 24-6 28 6 6-4 16-4 24 6z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Benefits() {
  return (
    <section aria-labelledby="benefits-title" className="relative py-20 sm:py-24">
      <div className="container">
        <SectionHeading
          id="benefits-title"
          eyebrow="Što dijete dobiva"
          title="Četiri područja razvoja u svakom treningu"
          intro="Svaki trening osmišljen je tako da dijete istovremeno razvija tijelo, glavu i odnose s drugima — kroz igru, bez pritiska rezultata."
        />
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((a, i) => (
            <Reveal as="li" key={a.title} delay={i * 0.08}>
              <article
                className={`lift relative h-full ${a.bg} px-6 pb-7 pt-9 ring-1 ring-ink/5 ${
                  a.deco === "balloon"
                    ? "rounded-[48%_52%_46%_54%/44%_44%_56%_56%] pb-10 text-center"
                    : a.deco === "cloud"
                      ? "rounded-[2.5rem] text-teal-100"
                      : a.deco === "pin"
                        ? "-rotate-1 rounded-3xl"
                        : "rotate-1 rounded-3xl"
                } shadow-soft`}
              >
                <Deco kind={a.deco} color={a.accent} />
                <div className={`flex ${a.deco === "balloon" ? "justify-center" : ""}`}>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft">
                    <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="#13385A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {a.icon}
                    </svg>
                  </span>
                </div>
                <h3 className="mt-4 text-[1.4rem] font-extrabold text-ink">{a.title}</h3>
                <ul className={`mt-3 grid gap-2 text-ink ${a.deco === "balloon" ? "justify-items-center" : ""}`}>
                  {a.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[1.02rem] font-semibold leading-snug">
                      <span aria-hidden="true" className="mt-[0.45rem] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "#13385A" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
