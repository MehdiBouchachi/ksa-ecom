import Link from "next/link";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const all = [{ name: "الرئيسية", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="مسار التنقل" className="text-[13px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className="text-border-strong">/</span>}
              {i === all.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.href} className="hover:underline">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${siteUrl}${c.href}` })),
        }}
      />
    </>
  );
}
