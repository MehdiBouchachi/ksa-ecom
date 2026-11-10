import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { sortLabel } from "@/i18n/ar";
import { getFacets, listCatalog } from "@/server/catalog";
import { parseCatalogParams } from "@/lib/search-params";
import { Breadcrumbs } from "./breadcrumbs";
import { Filters } from "./filters";
import { Pagination } from "./pagination";
import { ProductGrid } from "./product-card";

type SP = Record<string, string | string[] | undefined>;

export async function CatalogPage(props: {
  title: string;
  description?: string;
  basePath: string;
  searchParams: SP;
  fixed?: Partial<Record<"category" | "brand" | "collection", string>>;
  crumbs: { name: string; href: string }[];
}) {
  const { query, params } = parseCatalogParams(props.searchParams, props.fixed);
  const [result, facets] = await Promise.all([listCatalog(query), getFacets()]);
  const hide = Object.keys(props.fixed ?? {}) as ("category" | "brand" | "collection")[];

  // Active filter chips: each removes exactly one value (URL stays shareable).
  const without = (key: string, value?: string) => {
    const sp = new URLSearchParams(params);
    sp.delete("page");
    if (value === undefined) sp.delete(key);
    else {
      const rest = sp.getAll(key).filter((v) => v !== value);
      sp.delete(key);
      rest.forEach((v) => sp.append(key, v));
    }
    const s = sp.toString();
    return s ? `${props.basePath}?${s}` : props.basePath;
  };
  const chips: { label: string; href: string }[] = [
    ...(query.q ? [{ label: `«${query.q}»`, href: without("q") }] : []),
    ...query.color.map((c) => ({ label: facets.colors.find((x) => x.slug === c)?.name ?? c, href: without("color", c) })),
    ...query.size.map((s) => ({ label: `مقاس ${facets.sizes.find((x) => x.slug === s)?.name ?? s}`, href: without("size", s) })),
    ...(query.inStock ? [{ label: "المتوفر فقط", href: without("inStock") }] : []),
    ...(query.minPrice !== undefined ? [{ label: `من ${query.minPrice / 100} ر.س`, href: without("minSar") }] : []),
    ...(query.maxPrice !== undefined ? [{ label: `حتى ${query.maxPrice / 100} ر.س`, href: without("maxSar") }] : []),
    ...(["category", "brand", "collection"] as const)
      .filter((k) => query[k] && !hide.includes(k))
      .map((k) => ({ label: (k === "category" ? facets.categories : k === "brand" ? facets.brands : facets.collections).find((x) => x.slug === query[k])?.name ?? String(query[k]), href: without(k) })),
  ];

  return (
    <>
      <Breadcrumbs items={props.crumbs} />
      <header className="mt-3 border-b border-border pb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-4xl">{props.title}</h1>
        {props.description && <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{props.description}</p>}
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="تصفية وترتيب">
          {/* Mobile: collapsible panel (no JS). Desktop: sticky rail. */}
          <details className="group rounded-xl border border-border bg-card lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden /> تصفية وترتيب
                {chips.length > 0 && <span className="rounded-full bg-primary px-2 text-xs leading-5 text-primary-foreground">{chips.length}</span>}
              </span>
              <span className="text-sm font-normal text-muted-foreground">{sortLabel[query.sort]}</span>
            </summary>
            <div className="border-t border-border p-4">
              <Filters facets={facets} q={query} action={props.basePath} hide={hide} idPrefix="fm" />
            </div>
          </details>
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <Filters facets={facets} q={query} action={props.basePath} hide={hide} />
          </div>
        </aside>

        <section aria-label="النتائج">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <p className="me-2 text-sm text-muted-foreground" aria-live="polite">
              <span className="font-semibold text-foreground">{result.total}</span> {result.total === 1 ? "نتيجة" : "نتائج"}
            </p>
            {chips.map((c) => (
              <Link key={c.href + c.label} href={c.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm hover:border-foreground/30" aria-label={`إزالة عامل التصفية: ${c.label}`}>
                {c.label} <X className="size-3.5" aria-hidden />
              </Link>
            ))}
            {chips.length > 1 && <Link href={props.basePath} className="text-sm font-semibold text-primary hover:underline">مسح الكل</Link>}
          </div>
          <ProductGrid items={result.items} emptyHref={props.basePath} />
          <Pagination page={result.page} pageSize={result.pageSize} total={result.total} basePath={props.basePath} params={params} />
        </section>
      </div>
    </>
  );
}
