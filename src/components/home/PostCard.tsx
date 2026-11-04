import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { asset } from "@/lib/site";

export function PostCard({ post, headingLevel = "h3", priority = false }: { post: Post; headingLevel?: "h2" | "h3"; priority?: boolean }) {
  const H = headingLevel;
  return (
    <article className="lift card group relative flex h-full flex-col overflow-hidden focus-within:ring-4 focus-within:ring-navy/40">
      <div className="relative aspect-[16/10] overflow-hidden bg-pink-100">
        {post.coverImage && (
          <Image
            src={asset(post.coverImage)}
            alt={post.coverAlt || ""}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt && (
          <time dateTime={post.publishedAt} className="text-sm font-bold text-coral-700">
            {formatDate(post.publishedAt)}
          </time>
        )}
        <H className="mt-2 text-xl font-extrabold leading-snug">
          <Link href={`/novosti/${post.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {post.title}
          </Link>
        </H>
        <p className="mt-2 flex-1 leading-relaxed text-ink-soft">{post.excerpt}</p>
        <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1.5 font-bold text-navy">
          Pročitaj više <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}
