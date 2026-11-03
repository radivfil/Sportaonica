import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { PostCard } from "@/components/home/PostCard";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Novosti i obavijesti",
  description: "Obavijesti o upisima, terminima i događanjima u Sportaonici.",
  alternates: { canonical: "/novosti" },
};

export default async function NewsPage() {
  const posts = await getPublishedPosts();
  return (
    <>
      <PageHero title="Novosti i obavijesti" intro="Sve važne informacije o upisima, terminima i događanjima." crumbs={[{ name: "Novosti", path: "/novosti" }]} />
      <div className="container py-16">
        {posts.length === 0 ? (
          <p className="text-center text-lg text-ink-soft">Uskoro ovdje objavljujemo prve novosti.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal as="li" key={p.id} delay={(i % 3) * 0.06}>
                <PostCard post={p} headingLevel="h2" priority={i === 0} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
