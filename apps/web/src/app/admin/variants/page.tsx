import Link from "next/link";
import { Boxes, Grid3x3, Palette, Pencil, Plus, SearchX, Tags } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import {
  AdminPageHeader,
  btnCls,
  btnGhostCls,
  btnOutlineCls,
  CheckRow,
  EmptyState,
  Field,
  FilterBar,
  Flash,
  FormSection,
  iconBtnCls,
  inputCls,
  Pagination,
  StatStrip,
  StatusBadge,
  Swatch,
  Table,
  withParams,
} from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listColors, listProductsAdmin, listSizes, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { saveColorAction, saveSizeAction, saveVariantAction } from "../actions";

const T = {
  ar: {
    title: "الخيارات",
    desc: "كل خيار قابل للبيع = لون × مقاس من المنتج الرئيسي، وله SKU وسعر ومخزون خاص به.",
    add: "إضافة خيار",
    options: "الألوان والمقاسات",
    filters: "تصفية الخيارات",
    search: "بحث",
    searchPh: "SKU أو لون أو مقاس",
    color: "اللون",
    size: "المقاس",
    allColors: "كل الألوان",
    allSizes: "كل المقاسات",
    status: "الحالة",
    anyStatus: "كل الحالات",
    stock: "المخزون",
    anyStock: "كل المستويات",
    low: "منخفض",
    out: "نفد",
    apply: "تطبيق",
    clear: "مسح",
    statTotal: "الخيارات",
    statActive: "نشطة",
    statOut: "نفد مخزونها",
    statGaps: "تركيبات غير موجودة",
    cols: ["اللون", "المقاس", "SKU", "سعر التجزئة", "متاح", "محجوز", "الحالة", ""],
    active: "نشط",
    paused: "موقوف",
    edit: "تعديل",
    editTitle: (sku: string) => `تعديل الخيار ${sku}`,
    addTitle: "إضافة خيار جديد",
    addDesc: "لا يمكن تكرار نفس اللون والمقاس. المخزون يبدأ من 0 ويُضاف من صفحة المخزون.",
    secIdentity: "التركيبة",
    secPrice: "السعر",
    secSku: "الرمز والحالة",
    product: "المنتج",
    retail: "سعر التجزئة (ر.س)",
    compare: "السعر قبل الخصم (ر.س)",
    compareHint: "اختياري — يجب أن يكون أعلى من سعر التجزئة.",
    skuHint: "رمز فريد بحروف لاتينية، مثل TWL-RED-L",
    activeHint: "الخيار الموقوف لا يظهر في المتجر ولا يمكن شراؤه.",
    save: "حفظ التغييرات",
    create: "إضافة الخيار",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    close: "إغلاق",
    stockLink: "المخزون",
    priceLink: "التسعير",
    matrix: "خريطة التركيبات",
    matrixDesc: "كل خانة = لون × مقاس. الخانة الفارغة تعني أن التركيبة غير موجودة؛ اضغط + لإنشائها.",
    addCombo: (c: string, s: string) => `إضافة ${c} / ${s}`,
    availShort: (n: number) => `${n} متاح`,
    emptyTitle: "لا توجد خيارات بعد",
    emptyBody: "أضف الألوان والمقاسات أولًا، ثم أنشئ الخيارات القابلة للبيع.",
    noMatch: "لا توجد خيارات مطابقة للتصفية",
    noProduct: "أنشئ المنتج الرئيسي أولًا من صفحة المنتج.",
    prev: "السابق",
    next: "التالي",
    showing: (a: number, b: number, n: number) => `عرض ${a}–${b} من ${n}`,
    pages: "صفحات الخيارات",
    colors: "الألوان",
    sizes: "المقاسات",
    name: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    slug: "المعرّف (slug)",
    slugHint: "حروف لاتينية صغيرة وأرقام وشرطات",
    swatch: "لون العينة",
    order: "ترتيب العرض",
    addColor: "إضافة لون",
    addSize: "إضافة مقاس",
    editItem: "تعديل",
    none: "لا يوجد بعد.",
    optionsDesc: "القيم المتاحة لإنشاء الخيارات. الإيقاف يخفي القيمة دون حذف الطلبات السابقة.",
  },
  en: {
    title: "Variants",
    desc: "Each sellable variant = a color × size of the main product, with its own SKU, price and stock.",
    add: "Add variant",
    options: "Colors & sizes",
    filters: "Filter variants",
    search: "Search",
    searchPh: "SKU, color or size",
    color: "Color",
    size: "Size",
    allColors: "All colors",
    allSizes: "All sizes",
    status: "Status",
    anyStatus: "Any status",
    stock: "Stock",
    anyStock: "Any level",
    low: "Low",
    out: "Out of stock",
    apply: "Apply",
    clear: "Clear",
    statTotal: "Variants",
    statActive: "Active",
    statOut: "Out of stock",
    statGaps: "Missing combinations",
    cols: ["Color", "Size", "SKU", "Retail price", "Available", "Reserved", "Status", ""],
    active: "Active",
    paused: "Paused",
    edit: "Edit",
    editTitle: (sku: string) => `Edit variant ${sku}`,
    addTitle: "Add a variant",
    addDesc: "The same color and size cannot be added twice. Stock starts at 0 and is added on the Stock page.",
    secIdentity: "Combination",
    secPrice: "Price",
    secSku: "SKU & status",
    product: "Product",
    retail: "Retail price (SAR)",
    compare: "Compare-at price (SAR)",
    compareHint: "Optional — must be higher than the retail price.",
    skuHint: "Unique Latin code, e.g. TWL-RED-L",
    activeHint: "Paused variants are hidden from the store and cannot be bought.",
    save: "Save changes",
    create: "Add variant",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    stockLink: "Stock",
    priceLink: "Pricing",
    matrix: "Combination map",
    matrixDesc: "Each cell = color × size. An empty cell means the combination does not exist yet; press + to create it.",
    addCombo: (c: string, s: string) => `Add ${c} / ${s}`,
    availShort: (n: number) => `${n} available`,
    emptyTitle: "No variants yet",
    emptyBody: "Add colors and sizes first, then create the sellable variants.",
    noMatch: "No variants match these filters",
    noProduct: "Create the main product first on the Product page.",
    prev: "Previous",
    next: "Next",
    showing: (a: number, b: number, n: number) => `Showing ${a}–${b} of ${n}`,
    pages: "Variant pages",
    colors: "Colors",
    sizes: "Sizes",
    name: "Arabic name",
    nameEn: "English name",
    slug: "Slug",
    slugHint: "Lowercase Latin letters, digits and dashes",
    swatch: "Swatch color",
    order: "Display order",
    addColor: "Add color",
    addSize: "Add size",
    editItem: "Edit",
    none: "None yet.",
    optionsDesc: "Values used to build variants. Pausing hides a value without touching past orders.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

type SP = { q?: string; color?: string; size?: string; status?: string; stock?: string; page?: string; new?: string; ok?: string; error?: string };
const PAGE_SIZE = 50;

export default async function Variants({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const [variants, products, colors, sizes, commerce] = await Promise.all([listVariantsAdmin(), listProductsAdmin(), listColors(), listSizes(), getSetting("commerce")]);
  const threshold = commerce.lowStockThreshold;
  const rows = variants.map((v) => ({ ...v, colorName: (locale === "en" && v.colorNameEn) || v.colorName, avail: (v.onHand ?? 0) - (v.reserved ?? 0) }));
  const filters = { q: sp.q?.trim() || undefined, color: sp.color || undefined, size: sp.size || undefined, status: sp.status || undefined, stock: sp.stock || undefined };
  const q = filters.q?.toLowerCase();
  const filtered = rows.filter(
    (v) =>
      (!q || v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q) || v.sizeName.toLowerCase().includes(q)) &&
      (!filters.color || v.colorId === filters.color) &&
      (!filters.size || v.sizeId === filters.size) &&
      (!filters.status || (filters.status === "active" ? v.active : !v.active)) &&
      (!filters.stock || (filters.stock === "out" ? v.avail <= 0 : v.avail > 0 && v.avail <= threshold)),
  );
  const page = Math.max(1, Math.min(Number(sp.page) || 1, Math.ceil(filtered.length / PAGE_SIZE) || 1));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const anyFilter = Object.values(filters).some(Boolean);
  const current: Record<string, string | undefined> = { ...filters, page: page > 1 ? String(page) : undefined };
  const backHref = withParams("/admin/variants", current, {});

  // Matrix: active colours × sizes used by the catalogue.
  const activeColors = colors.filter((c) => c.active);
  const activeSizes = sizes.filter((s) => s.active);
  const byCombo = new Map(rows.map((v) => [`${v.colorId}:${v.sizeId}`, v]));
  const gaps = activeColors.length * activeSizes.length - activeColors.reduce((n, c) => n + activeSizes.filter((s) => byCombo.has(`${c.id}:${s.id}`)).length, 0);
  const singleProduct = products.length === 1 ? products[0] : null;
  const prefill = { color: sp.new && sp.color ? sp.color : undefined, size: sp.new && sp.size ? sp.size : undefined };

  const variantForm = (v?: (typeof rows)[number]) => (
    <form action={saveVariantAction} className="space-y-5">
      <input type="hidden" name="back" value={backHref} />
      {v && <input type="hidden" name="id" value={v.id} />}
      <FormSection title={t.secIdentity}>
        {singleProduct ? (
          <input type="hidden" name="productId" value={v?.productId ?? singleProduct.id} />
        ) : (
          <Field label={t.product} required className="sm:col-span-2">
            <select name="productId" required defaultValue={v?.productId} className={inputCls}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={t.color} required>
          <select name="colorId" required defaultValue={v?.colorId ?? prefill.color} className={inputCls}>
            {colors.map((c) => <option key={c.id} value={c.id}>{(locale === "en" && c.nameEn) || c.name}{c.active ? "" : ` (${t.paused})`}</option>)}
          </select>
        </Field>
        <Field label={t.size} required>
          <select name="sizeId" required defaultValue={v?.sizeId ?? prefill.size} className={inputCls}>
            {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : ` (${t.paused})`}</option>)}
          </select>
        </Field>
      </FormSection>
      <FormSection title={t.secPrice}>
        <Field label={t.retail} required>
          <input name="retailPrice" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" dir="ltr" placeholder="0.00" defaultValue={v ? (v.retailPriceHalalas / 100).toFixed(2) : undefined} className={inputCls} />
        </Field>
        <Field label={t.compare} hint={t.compareHint}>
          <input name="compareAtPrice" inputMode="decimal" pattern="\d+(\.\d{1,2})?" dir="ltr" placeholder="0.00" defaultValue={v?.compareAtPriceHalalas ? (v.compareAtPriceHalalas / 100).toFixed(2) : undefined} className={inputCls} />
        </Field>
      </FormSection>
      <FormSection title={t.secSku}>
        <Field label="SKU" required hint={t.skuHint}>
          <input name="sku" required dir="ltr" autoCapitalize="characters" spellCheck={false} defaultValue={v?.sku} className={cn(inputCls, "font-mono")} />
        </Field>
        <div>
          <CheckRow name="active" label={t.active} defaultChecked={v ? v.active : true} className="sm:mt-6.5" />
          <p className="mt-1 text-xs text-muted-foreground">{t.activeHint}</p>
        </div>
      </FormSection>
      <OverlayFooter cancelLabel={t.cancel}>
        <SubmitButton className={btnCls} pendingLabel={t.saving}>{v ? t.save : t.create}</SubmitButton>
      </OverlayFooter>
    </form>
  );

  const addButton = (
    <Overlay
      trigger={<><Plus className="size-4" aria-hidden /> {t.add}</>}
      triggerClassName={btnCls}
      title={t.addTitle}
      description={t.addDesc}
      closeLabel={t.close}
      defaultOpen={Boolean(sp.new)}
    >
      {products.length ? variantForm() : <p className="text-sm text-muted-foreground">{t.noProduct}</p>}
    </Overlay>
  );

  const actions = (v: (typeof rows)[number]) => (
    <div className="flex items-center justify-end gap-0.5">
      <Overlay trigger={<Pencil className="size-4" aria-hidden />} triggerClassName={iconBtnCls} triggerLabel={`${t.edit} ${v.sku}`} title={t.editTitle(v.sku)} closeLabel={t.close}>
        {variantForm(v)}
      </Overlay>
      <Link href={`/admin/inventory?q=${encodeURIComponent(v.sku)}`} className={iconBtnCls} aria-label={`${t.stockLink} — ${v.sku}`} title={t.stockLink}>
        <Boxes className="size-4" aria-hidden />
      </Link>
      <Link href={`/admin/pricing?variantId=${v.id}`} className={iconBtnCls} aria-label={`${t.priceLink} — ${v.sku}`} title={t.priceLink}>
        <Tags className="size-4" aria-hidden />
      </Link>
    </div>
  );

  const stockBadge = (n: number) => (
    <span className={cn("tabular font-medium", n <= 0 ? "text-destructive" : n <= threshold ? "text-warning" : undefined)}>
      {n}
      {n <= 0 ? <span className="sr-only"> — {t.out}</span> : n <= threshold ? <span className="sr-only"> — {t.low}</span> : null}
    </span>
  );

  return (
    <>
      <AdminPageHeader
        title={t.title}
        description={t.desc}
        primary={addButton}
        secondary={
          <Overlay trigger={<><Palette className="size-4" aria-hidden /> {t.options}</>} triggerClassName={btnOutlineCls} title={t.options} description={t.optionsDesc} closeLabel={t.close}>
            <OptionLists t={t} colors={colors} sizes={sizes} />
          </Overlay>
        }
      />
      <Flash sp={sp} />

      {rows.length === 0 ? (
        <EmptyState title={t.emptyTitle} action={addButton}>{t.emptyBody}</EmptyState>
      ) : (
        <>
          <StatStrip
            items={[
              { label: t.statTotal, value: rows.length },
              { label: t.statActive, value: rows.filter((r) => r.active).length },
              { label: t.statOut, value: rows.filter((r) => r.avail <= 0).length, tone: rows.some((r) => r.avail <= 0) ? "danger" : undefined, href: "/admin/variants?stock=out" },
              { label: t.statGaps, value: gaps },
            ]}
          />

          <FilterBar label={t.filters}>
            <label className="min-w-0 flex-1 basis-56">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.search}</span>
              <input type="search" name="q" defaultValue={filters.q} placeholder={t.searchPh} className={inputCls} />
            </label>
            <label className="w-[calc(50%-4px)] sm:w-40">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.color}</span>
              <select name="color" defaultValue={filters.color ?? ""} className={inputCls}>
                <option value="">{t.allColors}</option>
                {colors.map((c) => <option key={c.id} value={c.id}>{(locale === "en" && c.nameEn) || c.name}</option>)}
              </select>
            </label>
            <label className="w-[calc(50%-4px)] sm:w-36">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.size}</span>
              <select name="size" defaultValue={filters.size ?? ""} className={inputCls}>
                <option value="">{t.allSizes}</option>
                {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="w-[calc(50%-4px)] sm:w-36">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.status}</span>
              <select name="status" defaultValue={filters.status ?? ""} className={inputCls}>
                <option value="">{t.anyStatus}</option>
                <option value="active">{t.active}</option>
                <option value="paused">{t.paused}</option>
              </select>
            </label>
            <label className="w-[calc(50%-4px)] sm:w-36">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.stock}</span>
              <select name="stock" defaultValue={filters.stock ?? ""} className={inputCls}>
                <option value="">{t.anyStock}</option>
                <option value="low">{t.low}</option>
                <option value="out">{t.out}</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button className={btnOutlineCls}>{t.apply}</button>
              {anyFilter && <Link href="/admin/variants" className={btnGhostCls}>{t.clear}</Link>}
            </div>
          </FilterBar>

          {filtered.length === 0 ? (
            <EmptyState icon={SearchX} title={t.noMatch} action={<Link href="/admin/variants" className={btnOutlineCls}>{t.clear}</Link>} />
          ) : (
            <>
              {/* Desktop/tablet table */}
              <div className="hidden md:block">
                <Table head={t.cols} caption={t.title}>
                  {pageRows.map((v) => (
                    <tr key={v.id} className={cn(!v.active && "text-muted-foreground")}>
                      <td><span className="inline-flex items-center gap-2 whitespace-nowrap"><Swatch hex={v.swatchHex} /> {v.colorName}</span></td>
                      <td className="whitespace-nowrap font-medium">{v.sizeName}</td>
                      <td className="font-mono text-xs" dir="ltr">{v.sku}</td>
                      <td>
                        <span className="tabular whitespace-nowrap">{formatSAR(v.retailPriceHalalas, locale)}</span>
                        {v.compareAtPriceHalalas && <span className="tabular ms-2 whitespace-nowrap text-xs text-muted-foreground line-through">{formatSAR(v.compareAtPriceHalalas, locale)}</span>}
                      </td>
                      <td>{stockBadge(v.avail)}</td>
                      <td className="tabular text-muted-foreground">{v.reserved ?? 0}</td>
                      <td><StatusBadge tone={v.active ? "success" : "neutral"}>{v.active ? t.active : t.paused}</StatusBadge></td>
                      <td className="w-px">{actions(v)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
              {/* Mobile cards */}
              <ul className="space-y-2 md:hidden">
                {pageRows.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium"><Swatch hex={v.swatchHex} /> {v.colorName} / {v.sizeName}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</p>
                      </div>
                      <StatusBadge tone={v.active ? "success" : "neutral"}>{v.active ? t.active : t.paused}</StatusBadge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="tabular">{formatSAR(v.retailPriceHalalas, locale)}</span>
                      <span className="text-muted-foreground">{t.cols[4]}: {stockBadge(v.avail)}</span>
                      {actions(v)}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                hrefFor={(p) => withParams("/admin/variants", current, { page: p > 1 ? p : undefined })}
                labels={{ prev: t.prev, next: t.next, showing: t.showing, nav: t.pages }}
              />
            </>
          )}

          {activeColors.length > 0 && activeSizes.length > 0 && (
            <section className="mt-8" aria-labelledby="matrix-h">
              <h2 id="matrix-h" className="flex items-center gap-2 text-base font-semibold"><Grid3x3 className="size-4 text-muted-foreground" aria-hidden /> {t.matrix}</h2>
              <p className="mb-3 mt-0.5 text-sm text-muted-foreground">{t.matrixDesc}</p>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t.matrix}</caption>
                  <thead className="border-b border-border bg-surface-muted/60">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground">{t.color}</th>
                      {activeSizes.map((s) => <th key={s.id} scope="col" className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">{s.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeColors.map((c) => (
                      <tr key={c.id}>
                        <th scope="row" className="whitespace-nowrap px-3 py-2 text-start font-medium"><span className="inline-flex items-center gap-2"><Swatch hex={c.swatchHex} /> {(locale === "en" && c.nameEn) || c.name}</span></th>
                        {activeSizes.map((s) => {
                          const v = byCombo.get(`${c.id}:${s.id}`);
                          return (
                            <td key={s.id} className="px-2 py-1.5 text-center">
                              {v ? (
                                <Link
                                  href={withParams("/admin/variants", {}, { q: v.sku })}
                                  className={cn("tabular inline-flex min-h-9 min-w-16 items-center justify-center rounded-md px-2 text-xs ring-1 ring-inset hover:bg-muted", !v.active ? "text-muted-foreground ring-border" : v.avail <= 0 ? "text-destructive ring-destructive/25" : v.avail <= threshold ? "text-warning ring-warning/25" : "ring-border")}
                                  title={`${v.sku} — ${t.availShort(v.avail)}${v.active ? "" : ` — ${t.paused}`}`}
                                >
                                  {v.active ? v.avail : t.paused}
                                  <span className="sr-only"> — {v.sku}</span>
                                </Link>
                              ) : (
                                <Link
                                  href={withParams("/admin/variants", {}, { new: 1, color: c.id, size: s.id })}
                                  className="inline-grid size-9 place-items-center rounded-md border border-dashed border-border-strong text-muted-foreground hover:border-primary hover:text-primary"
                                  aria-label={t.addCombo(c.name, s.name)}
                                  title={t.addCombo(c.name, s.name)}
                                >
                                  <Plus className="size-4" aria-hidden />
                                </Link>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

type Opt = { id: string; slug: string; name: string; sortOrder: number; active: boolean };
function OptionLists({ t, colors, sizes }: { t: (typeof T)["ar"]; colors: (Opt & { nameEn: string | null; swatchHex: string })[]; sizes: Opt[] }) {
  const colorFields = (c?: (typeof colors)[number]) => (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.name} required><input name="name" required dir="auto" defaultValue={c?.name} className={inputCls} /></Field>
        <Field label={t.nameEn}><input name="nameEn" dir="ltr" defaultValue={c?.nameEn ?? undefined} className={inputCls} /></Field>
        <Field label={t.slug} required hint={t.slugHint}><input name="slug" required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={c?.slug} className={cn(inputCls, "font-mono")} /></Field>
        <Field label={t.swatch} required>
          <span className="flex gap-2">
            <input type="color" aria-label={t.swatch} defaultValue={c?.swatchHex ?? "#888888"} className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1" name="swatchHex" />
          </span>
        </Field>
        <Field label={t.order}><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={inputCls} /></Field>
        <CheckRow name="active" label={t.active} defaultChecked={c ? c.active : true} className="sm:mt-6.5" />
      </div>
    </>
  );
  const sizeFields = (s?: Opt) => (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.name} required><input name="name" required dir="auto" defaultValue={s?.name} className={inputCls} /></Field>
        <Field label={t.slug} required hint={t.slugHint}><input name="slug" required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={s?.slug} className={cn(inputCls, "font-mono")} /></Field>
        <Field label={t.order}><input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className={inputCls} /></Field>
        <CheckRow name="active" label={t.active} defaultChecked={s ? s.active : true} className="sm:mt-6.5" />
      </div>
    </>
  );
  const row = (key: string, label: React.ReactNode, active: boolean, form: React.ReactNode) => (
    <li key={key}>
      <details className="group rounded-md border border-border open:bg-surface-muted/50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">{label}</span>
          <span className="flex items-center gap-2">
            {!active && <StatusBadge>{t.paused}</StatusBadge>}
            <span className="text-xs font-medium text-primary group-open:hidden">{t.editItem}</span>
          </span>
        </summary>
        <div className="border-t border-border p-3">{form}</div>
      </details>
    </li>
  );
  return (
    <div className="space-y-8">
      <section aria-labelledby="colors-h">
        <h3 id="colors-h" className="mb-2 text-sm font-semibold">{t.colors}</h3>
        {colors.length ? (
          <ul className="space-y-1.5">
            {colors.map((c) =>
              row(c.id, <><Swatch hex={c.swatchHex} /> <span className="truncate">{c.name}</span> <span dir="ltr" className="font-mono text-xs text-muted-foreground">{c.slug}</span></>, c.active,
                <form action={saveColorAction} className="space-y-3">{colorFields(c)}<div className="flex justify-end"><SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton></div></form>),
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        )}
        <details className="mt-3 rounded-md border border-dashed border-border-strong">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden"><Plus className="size-4" aria-hidden /> {t.addColor}</summary>
          <form action={saveColorAction} className="space-y-3 border-t border-border p-3">{colorFields()}<div className="flex justify-end"><SubmitButton className={btnCls} pendingLabel={t.saving}>{t.addColor}</SubmitButton></div></form>
        </details>
      </section>
      <section aria-labelledby="sizes-h">
        <h3 id="sizes-h" className="mb-2 text-sm font-semibold">{t.sizes}</h3>
        {sizes.length ? (
          <ul className="space-y-1.5">
            {sizes.map((s) =>
              row(s.id, <><span className="font-medium">{s.name}</span> <span dir="ltr" className="font-mono text-xs text-muted-foreground">{s.slug}</span></>, s.active,
                <form action={saveSizeAction} className="space-y-3">{sizeFields(s)}<div className="flex justify-end"><SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton></div></form>),
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        )}
        <details className="mt-3 rounded-md border border-dashed border-border-strong">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden"><Plus className="size-4" aria-hidden /> {t.addSize}</summary>
          <form action={saveSizeAction} className="space-y-3 border-t border-border p-3">{sizeFields()}<div className="flex justify-end"><SubmitButton className={btnCls} pendingLabel={t.saving}>{t.addSize}</SubmitButton></div></form>
        </details>
      </section>
    </div>
  );
}
