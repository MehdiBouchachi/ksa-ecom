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
  return (
    <>
      <Breadcrumbs items={props.crumbs} />
      <h1 className="mt-2 text-2xl font-bold">{props.title}</h1>
      {props.description && <p className="mt-2 max-w-3xl text-muted-foreground">{props.description}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <details className="rounded-lg border border-border bg-card p-4 lg:hidden">
            <summary className="cursor-pointer font-semibold">تصفية وترتيب</summary>
            <div className="mt-4">
              <Filters facets={facets} q={query} action={props.basePath} hide={Object.keys(props.fixed ?? {}) as never} />
            </div>
          </details>
          <div className="hidden rounded-lg border border-border bg-card p-4 lg:block">
            <Filters facets={facets} q={query} action={props.basePath} hide={Object.keys(props.fixed ?? {}) as never} />
          </div>
        </aside>
        <section aria-label="النتائج">
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">{result.total} نتيجة</p>
          <ProductGrid items={result.items} />
          <Pagination page={result.page} pageSize={result.pageSize} total={result.total} basePath={props.basePath} params={params} />
        </section>
      </div>
    </>
  );
}
