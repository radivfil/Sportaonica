import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <JsonLd data={breadcrumbLd(items)} />
      <nav aria-label="Putanja" className="mb-6 text-sm font-semibold text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-navy hover:underline">Početna</Link>
          </li>
          {items.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-ink">{it.name}</span>
              ) : (
                <Link href={it.path} className="hover:text-navy hover:underline">{it.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
