import { formatSAR } from "@saudi-ecom/contracts";
import { btnCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listColors, listProductsAdmin, listSizes, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { saveColorAction, saveSizeAction, saveVariantAction } from "../actions";

export const metadata = { title: "الألوان والمقاسات" };

export default async function Variants({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const [variants, products, colors, sizes] = await Promise.all([listVariantsAdmin(), listProductsAdmin(), listColors(), listSizes()]);
  return (
    <>
      <PageTitle>الخيارات (لون + مقاس = SKU)</PageTitle>
      <Flash sp={await searchParams} />
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">إضافة خيار</h2>
        <form action={saveVariantAction} className="grid gap-2 sm:grid-cols-4">
          <Field label="المنتج"><select name="productId" required className={inputCls}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="اللون"><select name="colorId" required className={inputCls}>{colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="المقاس"><select name="sizeId" required className={inputCls}>{sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="SKU"><input name="sku" required dir="ltr" className={inputCls} /></Field>
          <Field label="سعر التجزئة (ر.س)"><input name="retailPrice" required inputMode="decimal" dir="ltr" className={inputCls} /></Field>
          <Field label="السعر قبل الخصم (اختياري)"><input name="compareAtPrice" inputMode="decimal" dir="ltr" className={inputCls} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> نشط</label>
          <div className="flex items-end"><button className={btnCls}>إضافة (المخزون يبدأ من 0)</button></div>
        </form>
      </section>
      <Table head={["SKU", "المنتج", "اللون / المقاس", "السعر", "المتوفر / المحجوز", "تعديل"]} empty={!variants.length}>
        {variants.map((v) => (
          <tr key={v.id}>
            <td className="font-mono" dir="ltr">{v.sku}</td>
            <td>{v.productName}</td>
            <td><span className="inline-block size-3 rounded-full border" style={{ background: v.swatchHex }} aria-hidden /> {v.colorName} / {v.sizeName}</td>
            <td>{formatSAR(v.retailPriceHalalas)}</td>
            <td>{(v.onHand ?? 0) - (v.reserved ?? 0)} / {v.reserved ?? 0}</td>
            <td>
              <form action={saveVariantAction} className="flex flex-wrap items-center gap-1">
                {(["id", "productId", "colorId", "sizeId", "sku"] as const).map((k) => <input key={k} type="hidden" name={k} value={v[k]} />)}
                <label className="sr-only" htmlFor={`p-${v.id}`}>السعر</label>
                <input id={`p-${v.id}`} name="retailPrice" defaultValue={(v.retailPriceHalalas / 100).toFixed(2)} dir="ltr" className={inputCls + " w-24"} />
                <input name="compareAtPrice" aria-label="السعر قبل الخصم" defaultValue={v.compareAtPriceHalalas ? (v.compareAtPriceHalalas / 100).toFixed(2) : ""} dir="ltr" className={inputCls + " w-24"} />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={v.active} /> نشط</label>
                <button className="text-primary">حفظ</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">الألوان</h2>
          <ul className="mb-3 space-y-1 text-sm">{colors.map((c) => <li key={c.id}><span className="inline-block size-3 rounded-full border" style={{ background: c.swatchHex }} aria-hidden /> {c.name} <span dir="ltr" className="text-muted-foreground">({c.slug})</span>{!c.active && " · موقوف"}</li>)}</ul>
          <form action={saveColorAction} className="grid grid-cols-2 gap-2">
            <input name="name" required placeholder="الاسم" className={inputCls} aria-label="اسم اللون" />
            <input name="slug" required placeholder="slug" dir="ltr" className={inputCls} aria-label="slug" />
            <input name="swatchHex" required placeholder="#000000" pattern="#[0-9A-Fa-f]{6}" dir="ltr" className={inputCls} aria-label="لون العينة" />
            <input name="sortOrder" type="number" placeholder="الترتيب" className={inputCls} aria-label="الترتيب" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> نشط</label>
            <button className={btnCls}>إضافة لون</button>
          </form>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">المقاسات</h2>
          <ul className="mb-3 space-y-1 text-sm">{sizes.map((s) => <li key={s.id}>{s.name} <span dir="ltr" className="text-muted-foreground">({s.slug})</span>{!s.active && " · موقوف"}</li>)}</ul>
          <form action={saveSizeAction} className="grid grid-cols-2 gap-2">
            <input name="name" required placeholder="الاسم" className={inputCls} aria-label="اسم المقاس" />
            <input name="slug" required placeholder="slug" dir="ltr" className={inputCls} aria-label="slug" />
            <input name="sortOrder" type="number" placeholder="الترتيب" className={inputCls} aria-label="الترتيب" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> نشط</label>
            <button className={btnCls}>إضافة مقاس</button>
          </form>
        </section>
      </div>
    </>
  );
}
