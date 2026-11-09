import type { CatalogQuery } from "@saudi-ecom/contracts";
import { sortLabel } from "@/i18n/ar";
import type { getFacets } from "@/server/catalog";

type Facets = Awaited<ReturnType<typeof getFacets>>;

/** Plain GET form: works without JavaScript, keeps the client bundle small. */
export function Filters({ facets, q, action, hide = [] }: { facets: Facets; q: CatalogQuery; action: string; hide?: ("category" | "brand" | "collection")[] }) {
  const sar = (h?: number) => (h === undefined ? "" : String(Math.round(h / 100)));
  return (
    <form action={action} method="get" className="space-y-5 text-sm" aria-label="تصفية المنتجات">
      <div>
        <label htmlFor="f-q" className="mb-1 block font-semibold">بحث</label>
        <input id="f-q" name="q" defaultValue={q.q ?? ""} className="min-h-11 w-full rounded-md border border-input bg-card px-3" />
      </div>
      <div>
        <label htmlFor="f-sort" className="mb-1 block font-semibold">الترتيب</label>
        <select id="f-sort" name="sort" defaultValue={q.sort} className="min-h-11 w-full rounded-md border border-input bg-card px-2">
          {Object.entries(sortLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {(
        [
          ["category", "التصنيف", facets.categories],
          ["brand", "العلامة التجارية", facets.brands],
          ["collection", "المجموعة", facets.collections],
        ] as const
      )
        .filter(([k, , list]) => !hide.includes(k) && list.length > 0)
        .map(([k, label, list]) => (
          <div key={k}>
            <label htmlFor={`f-${k}`} className="mb-1 block font-semibold">{label}</label>
            <select id={`f-${k}`} name={k} defaultValue={q[k] ?? ""} className="min-h-11 w-full rounded-md border border-input bg-card px-2">
              <option value="">الكل</option>
              {list.map((x) => (
                <option key={x.slug} value={x.slug}>{x.name}</option>
              ))}
            </select>
          </div>
        ))}
      {facets.colors.length > 0 && (
        <fieldset>
          <legend className="mb-1 font-semibold">اللون</legend>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <label key={c.slug} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-2 has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input type="checkbox" name="color" value={c.slug} defaultChecked={q.color.includes(c.slug)} className="size-4" />
                <span className="inline-block size-4 rounded-full border border-border" style={{ background: c.swatchHex }} aria-hidden />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {facets.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-1 font-semibold">المقاس</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <label key={s.slug} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border border-border px-2 has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input type="checkbox" name="size" value={s.slug} defaultChecked={q.size.includes(s.slug)} className="size-4" />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-1 font-semibold">السعر (ر.س)</legend>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="f-min">من</label>
          <input id="f-min" name="minSar" inputMode="numeric" placeholder="من" defaultValue={sar(q.minPrice)} className="min-h-11 w-full rounded-md border border-input bg-card px-2" />
          <label className="sr-only" htmlFor="f-max">إلى</label>
          <input id="f-max" name="maxSar" inputMode="numeric" placeholder="إلى" defaultValue={sar(q.maxPrice)} className="min-h-11 w-full rounded-md border border-input bg-card px-2" />
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="inStock" value="1" defaultChecked={q.inStock} className="size-4" /> المتوفر فقط
      </label>
      <div className="flex gap-2">
        <button type="submit" className="min-h-11 flex-1 rounded-md bg-primary px-4 font-semibold text-white">تطبيق</button>
        <a href={action} className="flex min-h-11 items-center rounded-md border border-input px-4">إعادة تعيين</a>
      </div>
    </form>
  );
}
