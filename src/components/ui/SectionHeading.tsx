import { Squiggle } from "./Doodles";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "center" | "left";
  id?: string;
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <div className={`mb-10 max-w-2xl sm:mb-12 ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <Tag id={id} className={`${Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-[2.75rem]"} font-extrabold`}>
        {title}
      </Tag>
      <Squiggle className={`mt-3 h-3 w-28 ${center ? "mx-auto" : ""}`} color="#91D2CE" />
      {intro && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</p>}
    </div>
  );
}
