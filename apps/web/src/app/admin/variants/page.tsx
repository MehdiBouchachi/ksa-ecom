import { Palette, Plus, Ruler } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { btnCls, btnOutlineCls, CheckRow, Field, Flash, inputCls, PageTitle, Section, StatusPill, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listColors, listProductsAdmin, listSizes, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { saveColorAction, saveSizeAction, saveVariantAction } from "../actions";

const T = {
  ar: {
    title: "الألوان والمقاسات",
    desc: "كل خيار = منتج + لون + مقاس، وله SKU ومخزون خاص به.",
    addVariant: "إضافة خيار",
    product: "المنتج",
    color: "اللون",
    size: "المقاس",
    retail: "سعر التجزئة (ر.س)",
    compare: "السعر قبل الخصم",
    optional: "اختياري",
    active: "نشط",
    add: "إضافة",
    stockNote: "المخزون يبدأ من 0 — أضفه من صفحة المخزون.",
    cols: ["SKU", "المنتج", "اللون / المقاس", "السعر", "متاح / محجوز", "تعديل سريع"],
    price: "السعر",
    save: "حفظ",
    colors: "الألوان",
    sizes: "المقاسات",
    name: "الاسم",
    swatch: "لون العينة",
    order: "الترتيب",
    addColor: "إضافة لون",
    addSize: "إضافة مقاس",
    pill: ["نشط", "موقوف"] as [string, string],
    none: "لا يوجد بعد.",
  },
  en: {
    title: "Colors & sizes",
    desc: "Each variant = product + color + size, with its own SKU and stock.",
    addVariant: "Add variant",
    product: "Product",
    color: "Color",
    size: "Size",
    retail: "Retail price (SAR)",
    compare: "Compare-at price",
    optional: "Optional",
    active: "Active",
    add: "Add",
    stockNote: "Stock starts at 0 — add it from the Inventory page.",
    cols: ["SKU", "Product", "Color / size", "Price", "Available / reserved", "Quick edit"],
    price: "Price",
    save: "Save",
    colors: "Colors",
    sizes: "Sizes",
    name: "Name",
    swatch: "Swatch",
    order: "Order",
    addColor: "Add color",
    addSize: "Add size",
    pill: ["Active", "Paused"] as [string, string],
    none: "None yet.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

const Swatch = ({ hex }: { hex: string }) => <span className="inline-block size-3.5 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: hex }} aria-hidden />;

export default async function Variants({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const [variants, products, colors, sizes] = await Promise.all([listVariantsAdmin(), listProductsAdmin(), listColors(), listSizes()]);
  const small = cn(inputCls, "min-h-9 w-24");
  return (
    <>
      <PageTitle description={t.desc}>{t.title}</PageTitle>
      <Flash sp={await searchParams} />

      <Section className="mb-6" title={<span className="flex items-center gap-2"><Plus className="size-4 text-primary" aria-hidden /> {t.addVariant}</span>}>
        <form action={saveVariantAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.product}><select name="productId" required className={inputCls}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={t.color}><select name="colorId" required className={inputCls}>{colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label={t.size}><select name="sizeId" required className={inputCls}>{sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="SKU"><input name="sku" required dir="ltr" className={inputCls} /></Field>
          <Field label={t.retail}><input name="retailPrice" required inputMode="decimal" dir="ltr" placeholder="0.00" className={inputCls} /></Field>
          <Field label={t.compare} hint={t.optional}><input name="compareAtPrice" inputMode="decimal" dir="ltr" placeholder="0.00" className={inputCls} /></Field>
          <div className="sm:pt-[1.625rem]"><CheckRow name="active" label={t.active} defaultChecked /></div>
          <div className="sm:pt-[1.625rem]"><button className={cn(btnCls, "w-full")}>{t.add}</button></div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">{t.stockNote}</p>
      </Section>

      <Table head={t.cols} empty={!variants.length}>
        {variants.map((v) => (
          <tr key={v.id}>
            <td className="font-mono text-xs" dir="ltr">{v.sku}</td>
            <td className="max-w-48 truncate">{v.productName}</td>
            <td><span className="inline-flex items-center gap-2"><Swatch hex={v.swatchHex} /> {v.colorName} / {v.sizeName}</span></td>
            <td className="tabular whitespace-nowrap">{formatSAR(v.retailPriceHalalas, locale)}</td>
            <td className="tabular">{(v.onHand ?? 0) - (v.reserved ?? 0)} <span className="text-muted-foreground">/ {v.reserved ?? 0}</span></td>
            <td>
              <form action={saveVariantAction} className="flex flex-nowrap items-center gap-1.5">
                {(["id", "productId", "colorId", "sizeId", "sku"] as const).map((k) => <input key={k} type="hidden" name={k} value={v[k]} />)}
                <input name="retailPrice" aria-label={t.price} defaultValue={(v.retailPriceHalalas / 100).toFixed(2)} dir="ltr" className={small} />
                <input name="compareAtPrice" aria-label={t.compare} placeholder={t.compare} defaultValue={v.compareAtPriceHalalas ? (v.compareAtPriceHalalas / 100).toFixed(2) : ""} dir="ltr" className={small} />
                <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap px-1 text-xs"><input type="checkbox" name="active" defaultChecked={v.active} className="size-4 accent-primary" /> {t.active}</label>
                <button className={cn(btnOutlineCls, "min-h-9 px-3 text-primary")}>{t.save}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={<span className="flex items-center gap-2"><Palette className="size-4 text-primary" aria-hidden /> {t.colors}</span>}>
          {colors.length ? (
            <ul className="mb-4 flex flex-wrap gap-2">
              {colors.map((c) => (
                <li key={c.id} className={cn("inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm", !c.active && "opacity-60")}>
                  <Swatch hex={c.swatchHex} /> {c.name}
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">{c.slug}</span>
                  {!c.active && <StatusPill on={false} labels={t.pill} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">{t.none}</p>
          )}
          <form action={saveColorAction} className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <input name="name" required dir="auto" placeholder={t.name} className={inputCls} aria-label={t.name} />
            <input name="slug" required placeholder="slug" dir="ltr" className={inputCls} aria-label="slug" />
            <input name="swatchHex" required placeholder="#000000" pattern="#[0-9A-Fa-f]{6}" dir="ltr" className={inputCls} aria-label={t.swatch} />
            <input name="sortOrder" type="number" placeholder={t.order} className={inputCls} aria-label={t.order} />
            <CheckRow name="active" label={t.active} defaultChecked />
            <button className={btnCls}>{t.addColor}</button>
          </form>
        </Section>
        <Section title={<span className="flex items-center gap-2"><Ruler className="size-4 text-primary" aria-hidden /> {t.sizes}</span>}>
          {sizes.length ? (
            <ul className="mb-4 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <li key={s.id} className={cn("inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm", !s.active && "opacity-60")}>
                  <span className="font-semibold">{s.name}</span>
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">{s.slug}</span>
                  {!s.active && <StatusPill on={false} labels={t.pill} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">{t.none}</p>
          )}
          <form action={saveSizeAction} className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <input name="name" required dir="auto" placeholder={t.name} className={inputCls} aria-label={t.name} />
            <input name="slug" required placeholder="slug" dir="ltr" className={inputCls} aria-label="slug" />
            <input name="sortOrder" type="number" placeholder={t.order} className={inputCls} aria-label={t.order} />
            <CheckRow name="active" label={t.active} defaultChecked />
            <button className={cn(btnCls, "col-span-2")}>{t.addSize}</button>
          </form>
        </Section>
      </div>
    </>
  );
}
