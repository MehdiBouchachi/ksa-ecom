import { catalogQuerySchema, type CatalogQuery } from "@saudi-ecom/contracts";

type SP = Record<string, string | string[] | undefined>;

/** Normalizes Next searchParams (repeated checkbox keys, SAR price inputs) into a CatalogQuery. */
export function parseCatalogParams(sp: SP, overrides: Partial<Record<string, string>> = {}): { query: CatalogQuery; params: URLSearchParams; filtered: boolean } {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || v === "") continue;
    for (const x of Array.isArray(v) ? v : [v]) if (x) params.append(k, x);
  }
  const join = (k: string) => params.getAll(k).join(",") || undefined;
  const toHalalas = (v: string | null) => (v && /^\d+(\.\d+)?$/.test(v) ? String(Math.round(Number(v) * 100)) : undefined);
  const raw = {
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    brand: params.get("brand") ?? undefined,
    collection: params.get("collection") ?? undefined,
    color: join("color"),
    size: join("size"),
    minPrice: toHalalas(params.get("minSar")),
    maxPrice: toHalalas(params.get("maxSar")),
    inStock: params.get("inStock") ?? undefined,
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ?? undefined,
    ...overrides,
  };
  const parsed = catalogQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : catalogQuerySchema.parse({});
  const filtered = [...params.keys()].length > 0;
  return { query, params, filtered };
}
