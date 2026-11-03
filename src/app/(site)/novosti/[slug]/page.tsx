import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { isAdmin } from "@/lib/admin-guard";

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const post = await repo().getPostBySlug(slug);
  if (!post) return null;
  if (post.status !== "published" && !(await isAdmin())) return null; // drafts visible only to the owner (preview)
  return post;
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
    robots: post.status !== "published" ? { index: false } : undefined,
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const post = await load((await params).slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: post.coverImage ? [post.coverImage.startsWith("http") ? post.coverImage : `${SITE_URL}${post.coverImage}`] : undefined,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo.png` } },
    mainEntityOfPage: `${SITE_URL}/novosti/${post.slug}`,
  };

  return (
    <article className="pb-16">
      <header className="relative -mt-[68px] bg-flyer pb-10 pt-[100px] lg:-mt-[76px] lg:pt-[120px]">
        <div className="container max-w-3xl">
          <Breadcrumbs items={[{ name: "Novosti", path: "/novosti" }, { name: post.title, path: `/novosti/${post.slug}` }]} />
          {post.status !== "published" && <p className="mb-3 inline-block rounded-full bg-butter-200 px-3 py-1 text-sm font-bold">Skica — vidljivo samo vama</p>}
          <h1 className="text-4xl font-extrabold sm:text-5xl">{post.title}</h1>
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
            <Image src={post.coverImage} alt={post.coverAlt || ""} fill priority sizes="(max-width: 800px) 100vw, 768px" className="object-cover" />
          </div>
        )}
        <div className="prose-sport" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.contentHtml) }} />
        <div className="mt-12 flex flex-wrap gap-3 border-t border-ink/10 pt-8">
          <Link href="/novosti" className="btn-secondary">
            <Icon name="arrow-left" /> Sve novosti
          </Link>
          <Link href="/upisi" className="btn-primary">
            Prijavi dijete <Icon name="arrow-right" />
          </Link>
        </div>
      </div>
      <JsonLd data={articleLd} />
    </article>
  );
}
