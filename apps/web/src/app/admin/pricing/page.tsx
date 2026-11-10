import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Layers3, Plus } from "lucide-react";
import { formatSAR, type PurchaseMode } from "@saudi-ecom/contracts";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import {
  AdminPageHeader,
  btnCls,
  btnDangerCls,
  btnGhostCls,
  btnOutlineCls,
  Callout,
  EmptyState,
  Field,
  FilterBar,
  Flash,
  inputCls,
  Section,
  StatusBadge,
  Swatch,
  Table,
  withParams,
} from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTiers, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { isAppError } from "@/server/lib/errors";
import { bulkMinimum, resolveUnitPrice, type TierRow } from "@/server/pricing/engine";
import { addTierAction, addTiersBatchAction, deactivateTierAction } from "../actions";

const T = {
  ar: {
    title: "التجزئة والجملة",
    desc: "سعر التجزئة لكل خيار، وشرائح الكمية للجملة أو لخصومات التجزئة. المخزون واحد للنوعين.",
    howTitle: "كيف يُحسب السعر؟",
    how: [
      "يُحسب السعر لكل خيار (لون × مقاس) في سطر الطلب بشكل مستقل، ولا تُجمع كميات ألوان أو مقاسات مختلفة.",
      "التجزئة: إذا وقعت الكمية في شريحة تجزئة نشطة يُطبَّق سعرها، وإلا يُطبَّق سعر التجزئة الأساسي للخيار.",
      "الجملة: الحد الأدنى = أصغر «من كمية» في شرائح الجملة. الكمية التي لا تقع في أي شريحة جملة تُرفض عند الدفع.",
    ],
    batch: "إضافة شريحة لعدة خيارات",
    batchDesc: "تُضاف نفس الشريحة لكل خيار محدد دفعة واحدة. إذا تداخلت مع شريحة قائمة في أي خيار، لا يُحفظ شيء.",
    pickVariants: "الخيارات",
    selectAll: "تحديد الكل",
    overview: "مقارنة الأسعار",
    filters: "تصفية",
    search: "بحث",
    searchPh: "SKU أو لون أو مقاس",
    apply: "تطبيق",
    clear: "مسح",
    cols: ["الخيار", "SKU", "سعر التجزئة", "حد الجملة الأدنى", "شرائح الجملة", "تنبيهات", ""],
    manage: "إدارة",
    none: "—",
    noBulk: "غير متاح",
    back: "كل الخيارات",
    retailPrice: "سعر التجزئة الأساسي",
    editRetail: "تعديل من صفحة الخيارات",
    bulkTiers: "شرائح الجملة",
    retailTiers: "خصومات كمية للتجزئة",
    retailTiersDesc: "اختيارية. بدونها يُطبَّق سعر التجزئة الأساسي على أي كمية.",
    bulkTiersDesc: "تحدد سعر القطعة حسب الكمية. أصغر «من كمية» هي الحد الأدنى للجملة.",
    tierCols: ["الكمية", "سعر القطعة", "التوفير", "الحالة", ""],
    active: "نشطة",
    inactive: "موقوفة",
    addTier: "إضافة شريحة",
    addTierTitle: (l: string) => `إضافة شريحة — ${l}`,
    mode: "النوع",
    bulk: "جملة",
    retail: "تجزئة (خصم كمية)",
    from: "من كمية",
    to: "إلى كمية",
    toHint: "اتركه فارغًا لـ «بلا حد أعلى».",
    unit: "سعر القطعة (ر.س)",
    unitHint: "سعر القطعة الواحدة شاملًا الضريبة إذا كانت الأسعار شاملة.",
    save: "إضافة الشريحة",
    saveBatch: "إضافة للخيارات المحددة",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    close: "إغلاق",
    stop: "إيقاف",
    stopTitle: "إيقاف الشريحة؟",
    stopBody: (r: string) => `لن تُطبَّق شريحة ${r} على الطلبات الجديدة. الطلبات السابقة تحتفظ بأسعارها.`,
    stopConfirm: "إيقاف الشريحة",
    noTiers: "لا توجد شرائح.",
    gap: (a: number, b: number) => `فجوة: الكميات ${a}–${b} غير مغطاة (تُرفض بالجملة).`,
    capped: (n: number) => `لا شريحة جملة لكميات أكبر من ${n}.`,
    preview: "معاينة السعر",
    previewDesc: "احسب سعر سطر طلب بالقيم المحفوظة فعليًا.",
    qty: "الكمية",
    calc: "احسب",
    applied: "الشريحة المطبقة",
    baseRetail: "سعر التجزئة الأساسي",
    unitP: "سعر القطعة",
    subtotal: "إجمالي السطر",
    errBulkNone: "الشراء بالجملة غير متاح لهذا الخيار.",
    errBulkMin: (n: number) => `الحد الأدنى لطلب الجملة ${n}.`,
    errQty: "الكمية خارج شرائح الجملة المتاحة.",
    errVariant: "هذا الخيار موقوف ولا يمكن بيعه.",
    empty: "لا توجد خيارات بعد",
    emptyBody: "أنشئ الخيارات أولًا، ثم حدّد أسعارها.",
    toVariants: "الذهاب إلى الخيارات",
    noMatch: "لا توجد خيارات مطابقة.",
    warnings: (n: number) => `${n} تنبيه`,
    paused: "موقوف",
  },
  en: {
    title: "Retail & wholesale",
    desc: "Each variant's retail price, plus quantity tiers for wholesale or retail volume discounts. Both modes share one stock.",
    howTitle: "How is the price chosen?",
    how: [
      "Prices are evaluated per variant (color × size) on an order line; quantities of different colors or sizes are never added together.",
      "Retail: if the quantity falls in an active retail tier, that tier's price applies; otherwise the variant's base retail price applies.",
      "Wholesale: the minimum is the smallest “from qty” among wholesale tiers. A quantity that falls in no wholesale tier is rejected at checkout.",
    ],
    batch: "Add tier to several variants",
    batchDesc: "Adds the same tier to every selected variant at once. If it overlaps an existing tier on any variant, nothing is saved.",
    pickVariants: "Variants",
    selectAll: "Select all",
    overview: "Price comparison",
    filters: "Filter",
    search: "Search",
    searchPh: "SKU, color or size",
    apply: "Apply",
    clear: "Clear",
    cols: ["Variant", "SKU", "Retail price", "Wholesale minimum", "Wholesale tiers", "Warnings", ""],
    manage: "Manage",
    none: "—",
    noBulk: "Not offered",
    back: "All variants",
    retailPrice: "Base retail price",
    editRetail: "Edit on the Variants page",
    bulkTiers: "Wholesale tiers",
    retailTiers: "Retail volume discounts",
    retailTiersDesc: "Optional. Without them the base retail price applies to any quantity.",
    bulkTiersDesc: "Set the unit price by quantity. The smallest “from qty” is the wholesale minimum.",
    tierCols: ["Quantity", "Unit price", "Saving", "Status", ""],
    active: "Active",
    inactive: "Inactive",
    addTier: "Add tier",
    addTierTitle: (l: string) => `Add tier — ${l}`,
    mode: "Type",
    bulk: "Wholesale",
    retail: "Retail (volume discount)",
    from: "From qty",
    to: "To qty",
    toHint: "Leave empty for “no upper limit”.",
    unit: "Unit price (SAR)",
    unitHint: "Price of one unit, VAT-inclusive if store prices include VAT.",
    save: "Add tier",
    saveBatch: "Add to selected variants",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    stop: "Deactivate",
    stopTitle: "Deactivate this tier?",
    stopBody: (r: string) => `Tier ${r} will no longer apply to new orders. Past orders keep their prices.`,
    stopConfirm: "Deactivate tier",
    noTiers: "No tiers.",
    gap: (a: number, b: number) => `Gap: quantities ${a}–${b} are not covered (rejected for wholesale).`,
    capped: (n: number) => `No wholesale tier above ${n} units.`,
    preview: "Price preview",
    previewDesc: "Calculate an order line with the values actually saved.",
    qty: "Quantity",
    calc: "Calculate",
    applied: "Applied tier",
    baseRetail: "Base retail price",
    unitP: "Unit price",
    subtotal: "Line total",
    errBulkNone: "Wholesale is not offered for this variant.",
    errBulkMin: (n: number) => `The wholesale minimum is ${n}.`,
    errQty: "The quantity is outside the available wholesale tiers.",
    errVariant: "This variant is paused and cannot be sold.",
    empty: "No variants yet",
    emptyBody: "Create variants first, then set their prices.",
    toVariants: "Go to Variants",
    noMatch: "No variants match.",
    warnings: (n: number) => `${n} warning${n === 1 ? "" : "s"}`,
    paused: "Paused",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

type Tier = Awaited<ReturnType<typeof listTiers>>[number];
const range = (x: { minQty: number; maxQty: number | null }) => (x.maxQty ? `${x.minQty}–${x.maxQty}` : `${x.minQty}+`);

/** Wholesale coverage problems (gaps make some quantities impossible to buy). */
function bulkWarnings(tiers: Tier[], t: (typeof T)["ar"]) {
  const b = tiers.filter((x) => x.active && x.mode === "BULK").sort((a, c) => a.minQty - c.minQty);
  const out: string[] = [];
  for (let i = 1; i < b.length; i++) {
    const prev = b[i - 1]!;
    if (prev.maxQty !== null && b[i]!.minQty > prev.maxQty + 1) out.push(t.gap(prev.maxQty + 1, b[i]!.minQty - 1));
  }
  const last = b[b.length - 1];
  if (last && last.maxQty !== null) out.push(t.capped(last.maxQty));
  return out;
}

type SP = { variantId?: string; q?: string; qty?: string; mode?: string; ok?: string; error?: string };

export default async function Pricing({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const variants = (await listVariantsAdmin()).map((v) => ({ ...v, colorName: (locale === "en" && v.colorNameEn) || v.colorName }));
  const label = (v: (typeof variants)[number]) => `${v.colorName} / ${v.sizeName}`;
  const selected = variants.find((v) => v.id === sp.variantId);
  const allTiers = await listTiers(selected?.id);

  const header = (
    <AdminPageHeader
      title={t.title}
      description={t.desc}
      primary={
        variants.length > 0 && (
          <Overlay trigger={<><Layers3 className="size-4" aria-hidden /> {t.batch}</>} triggerClassName={selected ? btnOutlineCls : btnCls} title={t.batch} description={t.batchDesc} closeLabel={t.close}>
            <form action={addTiersBatchAction} className="space-y-5">
              <input type="hidden" name="back" value={withParams("/admin/pricing", { variantId: selected?.id, q: sp.q }, {})} />
              <TierFields t={t} />
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t.pickVariants}<span className="ms-0.5 text-destructive" aria-hidden>*</span></legend>
                <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {variants.map((v) => (
                    <li key={v.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-muted">
                        <input type="checkbox" name="variantIds" value={v.id} defaultChecked={selected ? v.id === selected.id : false} className="size-4 accent-primary" />
                        <Swatch hex={v.swatchHex} />
                        <span className="min-w-0 flex-1 truncate">{label(v)}</span>
                        <span dir="ltr" className="font-mono text-xs text-muted-foreground">{v.sku}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <OverlayFooter cancelLabel={t.cancel}>
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.saveBatch}</SubmitButton>
              </OverlayFooter>
            </form>
          </Overlay>
        )
      }
    />
  );

  if (!variants.length) {
    return (
      <>
        {header}
        <Flash sp={sp} />
        <EmptyState title={t.empty} action={<Link href="/admin/variants" className={btnOutlineCls}>{t.toVariants}</Link>}>{t.emptyBody}</EmptyState>
      </>
    );
  }

  const how = (
    <Callout title={t.howTitle} className="mb-5">
      <ul className="mt-1 list-disc space-y-0.5 ps-4">{t.how.map((h) => <li key={h}>{h}</li>)}</ul>
    </Callout>
  );

  /* ---------------------------- Overview (no variant) ---------------------------- */
  if (!selected) {
    const q = sp.q?.trim().toLowerCase();
    const rows = variants.filter((v) => !q || v.sku.toLowerCase().includes(q) || label(v).toLowerCase().includes(q));
    return (
      <>
        {header}
        <Flash sp={sp} />
        {how}
        <FilterBar label={t.filters}>
          <label className="min-w-0 flex-1 basis-56 sm:max-w-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.search}</span>
            <input type="search" name="q" defaultValue={sp.q} placeholder={t.searchPh} className={inputCls} />
          </label>
          <button className={btnOutlineCls}>{t.apply}</button>
          {sp.q && <Link href="/admin/pricing" className={btnGhostCls}>{t.clear}</Link>}
        </FilterBar>
        <h2 className="sr-only">{t.overview}</h2>
        <Table head={t.cols} caption={t.overview} empty={!rows.length} emptyText={t.noMatch}>
          {rows.map((v) => {
            const tiers = allTiers.filter((x) => x.variantId === v.id);
            const bulk = tiers.filter((x) => x.mode === "BULK").sort((a, b) => a.minQty - b.minQty);
            const moq = bulkMinimum(tiers.map((x) => ({ ...x, mode: x.mode as PurchaseMode })) as TierRow[]);
            const warns = bulkWarnings(tiers, t);
            return (
              <tr key={v.id} className={cn(!v.active && "text-muted-foreground")}>
                <td><span className="inline-flex items-center gap-2 whitespace-nowrap"><Swatch hex={v.swatchHex} /> {label(v)}</span>{!v.active && <StatusBadge className="ms-2">{t.paused}</StatusBadge>}</td>
                <td className="font-mono text-xs" dir="ltr">{v.sku}</td>
                <td className="tabular whitespace-nowrap">{formatSAR(v.retailPriceHalalas, locale)}</td>
                <td className="tabular">{moq ?? <span className="text-muted-foreground">{t.noBulk}</span>}</td>
                <td className="text-xs">
                  {bulk.length ? (
                    <span className="flex flex-wrap gap-1">
                      {bulk.map((x) => (
                        <span key={x.id} className="tabular whitespace-nowrap rounded bg-surface-muted px-1.5 py-0.5"><span dir="ltr">{range(x)}</span> · {formatSAR(x.unitPriceHalalas, locale)}</span>
                      ))}
                    </span>
                  ) : (
                    t.none
                  )}
                </td>
                <td>{warns.length ? <StatusBadge tone="warning"><span title={warns.join("\n")}>{t.warnings(warns.length)}</span></StatusBadge> : t.none}</td>
                <td className="w-px text-end">
                  <Link href={`/admin/pricing?variantId=${v.id}`} className={cn(btnOutlineCls, "min-h-9 px-3")} aria-label={`${t.manage} — ${v.sku}`}>{t.manage}</Link>
                </td>
              </tr>
            );
          })}
        </Table>
      </>
    );
  }

  /* ------------------------------ Variant workspace ------------------------------ */
  const tiers = allTiers; // all tiers (active + inactive) for this variant
  const active = tiers.filter((x) => x.active);
  const warns = bulkWarnings(tiers, t);
  const backHref = `/admin/pricing?variantId=${selected.id}`;
  const qty = Number(sp.qty);
  const mode: PurchaseMode = sp.mode === "BULK" ? "BULK" : "RETAIL";
  let preview: { unit: number; tier: { minQty: number; maxQty: number | null } | null } | { error: string } | null = null;
  if (Number.isInteger(qty) && qty >= 1) {
    try {
      preview = resolveUnitPrice(
        { variantId: selected.id, sellable: selected.active, retailPriceHalalas: selected.retailPriceHalalas, tiers: active.map((x) => ({ ...x, mode: x.mode as PurchaseMode })) },
        mode,
        qty,
      );
    } catch (e) {
      if (!isAppError(e)) throw e;
      const moq = bulkMinimum(active.map((x) => ({ ...x, mode: x.mode as PurchaseMode })));
      preview = { error: e.code === "INVALID_VARIANT" ? t.errVariant : e.code === "BULK_MINIMUM_NOT_MET" ? (moq === null ? t.errBulkNone : t.errBulkMin(moq)) : t.errQty };
    }
  }

  const tierTable = (m: PurchaseMode) => {
    const list = tiers.filter((x) => x.mode === m).sort((a, b) => Number(b.active) - Number(a.active) || a.minQty - b.minQty);
    return (
      <Table head={[t.tierCols[0], t.tierCols[1], t.tierCols[2], t.tierCols[3], ""]} caption={m === "BULK" ? t.bulkTiers : t.retailTiers} empty={!list.length} emptyText={t.noTiers} bare>
        {list.map((x) => {
          const saving = Math.round(((selected.retailPriceHalalas - x.unitPriceHalalas) / selected.retailPriceHalalas) * 100);
          return (
            <tr key={x.id} className={cn(!x.active && "text-muted-foreground")}>
              <td className="tabular" dir="ltr">{range(x)}</td>
              <td className="tabular whitespace-nowrap font-semibold">{formatSAR(x.unitPriceHalalas, locale)}</td>
              <td className="tabular">{saving > 0 ? `${saving}%` : t.none}</td>
              <td><StatusBadge tone={x.active ? "success" : "neutral"}>{x.active ? t.active : t.inactive}</StatusBadge></td>
              <td className="w-px text-end">
                {x.active && (
                  <Overlay kind="modal" trigger={t.stop} triggerClassName={cn(btnGhostCls, "min-h-9 text-destructive hover:bg-destructive-soft hover:text-destructive")} triggerLabel={`${t.stop} ${range(x)}`} title={t.stopTitle} closeLabel={t.close}>
                    <form action={deactivateTierAction}>
                      <input type="hidden" name="tierId" value={x.id} />
                      <input type="hidden" name="variantId" value={selected.id} />
                      <input type="hidden" name="back" value={backHref} />
                      <p className="text-sm">{t.stopBody(range(x))}</p>
                      <OverlayFooter cancelLabel={t.cancel}>
                        <SubmitButton className={btnDangerCls} pendingLabel={t.saving}>{t.stopConfirm}</SubmitButton>
                      </OverlayFooter>
                    </form>
                  </Overlay>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    );
  };

  return (
    <>
      {header}
      <Flash sp={sp} />
      <Link href="/admin/pricing" className={cn(btnGhostCls, "-ms-3 mb-3")}>
        <ArrowRight className="size-4 ltr:hidden" aria-hidden />
        <ArrowLeft className="size-4 rtl:hidden" aria-hidden />
        {t.back}
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold"><Swatch hex={selected.swatchHex} className="size-4" /> {label(selected)} {!selected.active && <StatusBadge>{t.paused}</StatusBadge>}</p>
          <p className="font-mono text-xs text-muted-foreground" dir="ltr">{selected.sku}</p>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{t.retailPrice}</p>
          <p className="tabular text-lg font-semibold">{formatSAR(selected.retailPriceHalalas, locale)}</p>
          <Link href={`/admin/variants?q=${encodeURIComponent(selected.sku)}`} className="text-xs text-primary hover:underline">{t.editRetail}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {warns.map((w) => <Callout key={w} tone="warning">{w}</Callout>)}
          <Section
            title={t.bulkTiers}
            bodyClassName="p-0"
            actions={
              <Overlay trigger={<><Plus className="size-4" aria-hidden /> {t.addTier}</>} triggerClassName={cn(btnOutlineCls, "min-h-9")} title={t.addTierTitle(label(selected))} closeLabel={t.close}>
                <form action={addTierAction} className="space-y-5">
                  <input type="hidden" name="variantId" value={selected.id} />
                  <input type="hidden" name="back" value={backHref} />
                  <TierFields t={t} />
                  <OverlayFooter cancelLabel={t.cancel}>
                    <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
                  </OverlayFooter>
                </form>
              </Overlay>
            }
          >
            <p className="border-b border-border px-5 py-2.5 text-xs text-muted-foreground">{t.bulkTiersDesc}</p>
            {tierTable("BULK")}
          </Section>
          <Section title={t.retailTiers} bodyClassName="p-0">
            <p className="border-b border-border px-5 py-2.5 text-xs text-muted-foreground">{t.retailTiersDesc}</p>
            {tierTable("RETAIL")}
          </Section>
          {how}
        </div>

        <Section title={<span className="flex items-center gap-2"><Calculator className="size-4 text-muted-foreground" aria-hidden /> {t.preview}</span>} className="h-fit lg:sticky lg:top-0">
          <p className="mb-3 text-xs text-muted-foreground">{t.previewDesc}</p>
          <form method="get" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="variantId" value={selected.id} />
            <Field label={t.mode}>
              <select name="mode" defaultValue={mode} className={inputCls}>
                <option value="RETAIL">{t.retail}</option>
                <option value="BULK">{t.bulk}</option>
              </select>
            </Field>
            <Field label={t.qty}>
              <input name="qty" type="number" min={1} step={1} required dir="ltr" defaultValue={sp.qty} className={inputCls} />
            </Field>
            <button className={cn(btnOutlineCls, "col-span-2")}>{t.calc}</button>
          </form>
          {preview && (
            <div className="mt-4 border-t border-border pt-4" role="status">
              {"error" in preview ? (
                <p className="text-sm text-destructive">{preview.error}</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.applied}</dt><dd className="tabular" dir="ltr">{preview.tier ? range(preview.tier) : t.baseRetail}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.unitP}</dt><dd className="tabular">{formatSAR(preview.unit, locale)}</dd></div>
                  <div className="flex justify-between gap-2 border-t border-border pt-2 font-semibold"><dt>{t.subtotal} <span className="tabular font-normal text-muted-foreground">× {qty}</span></dt><dd className="tabular">{formatSAR(preview.unit * qty, locale)}</dd></div>
                </dl>
              )}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

function TierFields({ t }: { t: (typeof T)["ar"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t.mode} required className="sm:col-span-2">
        <select name="mode" className={inputCls}>
          <option value="BULK">{t.bulk}</option>
          <option value="RETAIL">{t.retail}</option>
        </select>
      </Field>
      <Field label={t.from} required><input name="minQty" type="number" min={1} step={1} required dir="ltr" className={inputCls} /></Field>
      <Field label={t.to} hint={t.toHint}><input name="maxQty" type="number" min={1} step={1} dir="ltr" className={inputCls} /></Field>
      <Field label={t.unit} required hint={t.unitHint} className="sm:col-span-2">
        <input name="unitPrice" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" dir="ltr" placeholder="0.00" className={inputCls} />
      </Field>
    </div>
  );
}
