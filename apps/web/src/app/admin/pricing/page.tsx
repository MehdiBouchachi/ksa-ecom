import { Info, Layers3, Plus } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { btnCls, btnDangerCls, Field, Flash, inputCls, PageTitle, Section, StatusPill, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTiers, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { addTierAction, deactivateTierAction } from "../actions";

const T = {
  ar: {
    title: "أسعار الجملة",
    desc: "شرائح الكمية لكل خيار. الحد الأدنى للجملة = أصغر شريحة جملة.",
    info: "تُقيَّم الشرائح لكل خيار (لون + مقاس) بشكل مستقل. لا يُسمح بتداخل الشرائح. الأسعار يحددها التاجر — لا توجد قيم افتراضية.",
    variant: "الخيار",
    all: "كل الشرائح النشطة",
    show: "عرض",
    addTier: "إضافة شريحة",
    pickFirst: "اختر خيارًا أعلاه لإضافة شريحة له.",
    mode: "النوع",
    bulk: "جملة",
    retail: "تجزئة (خصم كمية)",
    retailShort: "تجزئة",
    from: "من كمية",
    to: "إلى كمية",
    toHint: "فارغ = بلا حد",
    unit: "سعر القطعة (ر.س)",
    add: "إضافة",
    cols: ["SKU", "النوع", "الكمية", "سعر القطعة", "الحالة", ""],
    pill: ["نشطة", "موقوفة"] as [string, string],
    stop: "إيقاف",
    empty: "لا توجد شرائح بعد",
  },
  en: {
    title: "Wholesale pricing",
    desc: "Quantity tiers per variant. Wholesale minimum = the smallest wholesale tier.",
    info: "Tiers are evaluated per variant (color + size) independently. Overlapping tiers are rejected. Prices are set by the merchant — there are no defaults.",
    variant: "Variant",
    all: "All active tiers",
    show: "Show",
    addTier: "Add tier",
    pickFirst: "Pick a variant above to add a tier to it.",
    mode: "Type",
    bulk: "Wholesale",
    retail: "Retail (quantity discount)",
    retailShort: "Retail",
    from: "From qty",
    to: "To qty",
    toHint: "Empty = no limit",
    unit: "Unit price (SAR)",
    add: "Add",
    cols: ["SKU", "Type", "Quantity", "Unit price", "Status", ""],
    pill: ["Active", "Paused"] as [string, string],
    stop: "Deactivate",
    empty: "No tiers yet",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

export default async function Pricing({ searchParams }: { searchParams: Promise<{ variantId?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const variants = await listVariantsAdmin();
  const variantId = sp.variantId && variants.some((v) => v.id === sp.variantId) ? sp.variantId : undefined;
  const tiers = await listTiers(variantId);
  return (
    <>
      <PageTitle description={t.desc}>{t.title}</PageTitle>
      <Flash sp={sp} />
      <div className="mb-5 flex gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{t.info}</p>
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1 sm:max-w-md">
          <span className="sr-only">{t.variant}</span>
          <select name="variantId" defaultValue={variantId ?? ""} className={inputCls}>
            <option value="">{t.all}</option>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.colorName} / {v.sizeName}</option>)}
          </select>
        </label>
        <button className={btnCls}>{t.show}</button>
      </form>

      <Section className="mb-6" title={<span className="flex items-center gap-2"><Plus className="size-4 text-primary" aria-hidden /> {t.addTier}</span>}>
        {variantId ? (
          <form action={addTierAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="variantId" value={variantId} />
            <Field label={t.mode}><select name="mode" className={inputCls}><option value="BULK">{t.bulk}</option><option value="RETAIL">{t.retail}</option></select></Field>
            <Field label={t.from}><input name="minQty" type="number" min={1} required className={inputCls} /></Field>
            <Field label={t.to} hint={t.toHint}><input name="maxQty" type="number" min={1} className={inputCls} /></Field>
            <Field label={t.unit}><input name="unitPrice" required inputMode="decimal" dir="ltr" placeholder="0.00" className={inputCls} /></Field>
            <div className="sm:pt-[1.625rem]"><button className={cn(btnCls, "w-full")}>{t.add}</button></div>
          </form>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Layers3 className="size-4" aria-hidden /> {t.pickFirst}</p>
        )}
      </Section>

      <Table head={t.cols} empty={!tiers.length} emptyText={t.empty}>
        {tiers.map((x) => (
          <tr key={x.id}>
            <td className="font-mono text-xs" dir="ltr">{x.sku}</td>
            <td>
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", x.mode === "BULK" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700")}>
                {x.mode === "BULK" ? t.bulk : t.retailShort}
              </span>
            </td>
            <td className="tabular" dir="ltr">{x.minQty}{x.maxQty ? `–${x.maxQty}` : "+"}</td>
            <td className="tabular whitespace-nowrap font-semibold">{formatSAR(x.unitPriceHalalas, locale)}</td>
            <td><StatusPill on={x.active} labels={t.pill} /></td>
            <td className="text-end">
              {x.active && (
                <form action={deactivateTierAction}>
                  <input type="hidden" name="tierId" value={x.id} />
                  <input type="hidden" name="variantId" value={x.variantId} />
                  <button className={cn(btnDangerCls, "min-h-8 px-2.5 text-xs")}>{t.stop}</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
