import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicRepo } from "@/lib/data";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import { articleLd } from "@/lib/seo";
import { Gallery } from "@/components/home/Gallery";
import { asset } from "@/lib/site";

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const post = await publicRepo().getPostBySlug(slug);
  return post && post.status === "published" ? post : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await load((await params).slug);
  if (!post) return { title: "Objava nije pronađena" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/novosti/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.publishedAt,
      ...(post.coverImage ? { images: [{ url: post.coverImage, alt: post.coverAlt || post.title }] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const post = await load((await params).slug);
  if (!post) notFound();

  return (
    <article className="pb-16">
      <header className="relative -mt-[68px] bg-flyer pb-10 pt-[100px] lg:-mt-[76px] lg:pt-[120px]">
        <div className="container max-w-3xl">
          <Breadcrumbs items={[{ name: "Novosti", path: "/novosti" }, { name: post.title, path: `/novosti/${post.slug}` }]} />
          <h1 className="text-[2.1rem] font-extrabold [hyphens:auto] [overflow-wrap:break-word] sm:text-5xl">{post.title}</h1>
          {post.publishedAt && (
            <time dateTime={post.publishedAt} className="mt-4 block font-bold text-coral-700">
              {formatDate(post.publishedAt)}
            </time>
          )}
        </div>
      </header>
      <div className="container max-w-3xl">
        {post.coverImage && (
          <div className="relative -mt-2 mb-10 aspect-[16/9] overflow-hidden rounded-4xl bg-pink-100 shadow-soft">
            <Image src={asset(post.coverImage)} alt={post.coverAlt || ""} fill priority sizes="(max-width: 800px) 100vw, 768px" className="object-cover" />
          </div>
        )}
        <div className="prose-sport" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.contentHtml) }} />
        {post.images.length > 0 && (
          <section aria-label="Fotografije" className="mt-10">
            <Gallery images={post.images.map((im, i) => ({ id: String(i), src: im.src, alt: im.alt, width: 1200, height: 900 }))} />
          </section>
        )}
        <div className="mt-12 flex flex-wrap gap-3 border-t border-ink/10 pt-8">
          <Link href="/novosti" className="btn-secondary">
            <Icon name="arrow-left" /> Sve novosti
          </Link>
          <Link href="/aktivnosti" className="btn-primary">
            Programi i termini <Icon name="arrow-right" />
          </Link>
        </div>
      </div>
      <JsonLd data={articleLd(post)} />
    </article>
  );
}
