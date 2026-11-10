import type { CatalogQuery } from "@saudi-ecom/contracts";
import { sortLabel } from "@/i18n/ar";
import type { getFacets } from "@/server/catalog";
import { btnPrimary, btnSecondary, fieldCls } from "./ui";

type Facets = Awaited<ReturnType<typeof getFacets>>;
const group = "border-b border-border pb-5";
const legend = "mb-2.5 text-sm font-semibold";
const chip =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:border-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-semibold has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40";

/** Plain GET form: works without JavaScript, keeps the client bundle small, and every state is a shareable URL. */
export function Filters({ facets, q, action, hide = [], idPrefix = "f" }: { facets: Facets; q: CatalogQuery; action: string; hide?: ("category" | "brand" | "collection")[]; idPrefix?: string }) {
  const sar = (h?: number) => (h === undefined ? "" : String(Math.round(h / 100)));
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <form action={action} method="get" className="space-y-5" aria-label="تصفية المنتجات">
      <div className={group}>
        <label htmlFor={id("q")} className={`${legend} block`}>بحث</label>
        <input id={id("q")} name="q" type="search" defaultValue={q.q ?? ""} placeholder="لون، مقاس أو رمز" className={fieldCls} />
      </div>
      <div className={group}>
        <label htmlFor={id("sort")} className={`${legend} block`}>الترتيب</label>
        <select id={id("sort")} name="sort" defaultValue={q.sort} className={fieldCls}>
          {Object.entries(sortLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {facets.colors.length > 0 && (
        <fieldset className={group}>
          <legend className={legend}>اللون</legend>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <label key={c.slug} className={chip}>
                <input type="checkbox" name="color" value={c.slug} defaultChecked={q.color.includes(c.slug)} className="sr-only" />
                <span className="inline-block size-4 rounded-full ring-1 ring-black/15" style={{ background: c.swatchHex }} aria-hidden />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {facets.sizes.length > 0 && (
        <fieldset className={group}>
          <legend className={legend}>المقاس</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <label key={s.slug} className={`${chip} min-w-12 justify-center`}>
                <input type="checkbox" name="size" value={s.slug} defaultChecked={q.size.includes(s.slug)} className="sr-only" />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {(
        [
          ["category", "التصنيف", facets.categories],
          ["brand", "العلامة التجارية", facets.brands],
          ["collection", "المجموعة", facets.collections],
        ] as const
      )
        // Only offer groupings that actually discriminate (2+ options).
        .filter(([k, , list]) => !hide.includes(k) && list.length > 1)
        .map(([k, label, list]) => (
          <div key={k} className={group}>
            <label htmlFor={id(k)} className={`${legend} block`}>{label}</label>
            <select id={id(k)} name={k} defaultValue={q[k] ?? ""} className={fieldCls}>
              <option value="">الكل</option>
              {list.map((x) => (
                <option key={x.slug} value={x.slug}>{x.name}</option>
              ))}
            </select>
          </div>
        ))}
      <fieldset className={group}>
        <legend className={legend}>السعر (ر.س)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={id("min")}>من</label>
          <input id={id("min")} name="minSar" inputMode="numeric" placeholder="من" dir="ltr" defaultValue={sar(q.minPrice)} className={fieldCls} />
          <span className="text-muted-foreground" aria-hidden>–</span>
          <label className="sr-only" htmlFor={id("max")}>إلى</label>
          <input id={id("max")} name="maxSar" inputMode="numeric" placeholder="إلى" dir="ltr" defaultValue={sar(q.maxPrice)} className={fieldCls} />
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={q.inStock} className="size-5 accent-primary" /> المتوفر فقط
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className={`${btnPrimary} flex-1`}>تطبيق</button>
        <a href={action} className={btnSecondary}>إعادة تعيين</a>
      </div>
    </form>
  );
}
