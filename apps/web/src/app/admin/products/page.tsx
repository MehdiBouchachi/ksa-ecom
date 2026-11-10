import Link from "next/link";
import { Boxes, ExternalLink, Film, ImagePlus, Palette, Pencil, Star, Tags, Trash2 } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import { AdminPageHeader, btnCls, btnDangerCls, btnOutlineCls, Callout, CheckRow, EmptyState, Field, Flash, FormSection, iconBtnCls, inputCls, Section, StatusBadge, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { getProductAdmin, listColors, listProductsAdmin, listTaxonomyAdmin, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { addMediaAction, deleteMediaAction, saveProductAction } from "../actions";

const T = {
  ar: {
    title: "المنتج الرئيسي",
    desc: "المتجر يبيع عائلة منتج واحدة؛ الألوان والمقاسات خيارات لهذا المنتج وليست منتجات منفصلة.",
    edit: "تعديل المنتج",
    create: "إنشاء المنتج الرئيسي",
    emptyTitle: "لم يُنشأ المنتج الرئيسي بعد",
    emptyBody: "أنشئ المنتج (الاسم والوصف)، ثم أضف الألوان والمقاسات والأسعار والمخزون.",
    viewStore: "عرض في المتجر",
    status: "الحالة",
    active: "ظاهر في المتجر",
    hidden: "مخفي",
    featured: "مميز في الصفحة الرئيسية",
    variants: "الخيارات",
    variantsOf: (a: number, n: number) => `${a} نشط من ${n}`,
    price: "سعر التجزئة",
    stock: "المخزون المتاح",
    stockOf: (u: number, o: number) => (o ? `${u} قطعة · ${o} خيار نفد` : `${u} قطعة`),
    manageVariants: "إدارة الخيارات",
    managePricing: "إدارة الأسعار",
    manageStock: "إدارة المخزون",
    description: "الوصف",
    noDescription: "لا يوجد وصف بعد.",
    specs: "المواصفات",
    taxonomy: "التصنيف والعرض",
    categories: "التصنيفات",
    brands: "العلامات",
    collections: "المجموعات",
    none: "لا شيء",
    media: "الصور والفيديو",
    mediaDesc: "ارفع الملفات إلى التخزين المعتمد (مثل R2) والصق الرابط هنا. لا تُحفظ الملفات في مجلد النشر.",
    noMedia: "لا توجد وسائط بعد",
    noMediaBody: "أضف صورة واحدة على الأقل لكل لون حتى يظهر المنتج بشكل صحيح في المتجر.",
    addMedia: "إضافة وسائط",
    url: "رابط الملف",
    urlHint: "رابط https من التخزين المعتمد.",
    alt: "وصف الصورة (للقارئات الصوتية)",
    color: "اللون",
    allColors: "كل الألوان",
    kind: "النوع",
    image: "صورة",
    video: "فيديو",
    order: "ترتيب العرض",
    add: "إضافة",
    del: "حذف",
    delTitle: "حذف الوسيط؟",
    delBody: "سيُزال من صفحة المنتج. الملف نفسه يبقى في التخزين.",
    delConfirm: "حذف",
    secBasics: "الأساسيات",
    name: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    slug: "الرابط (slug)",
    slugHint: "يظهر في رابط صفحة المنتج. تغييره يغيّر الرابط.",
    secContent: "الوصف والمواصفات",
    specsHint: "سطر لكل مواصفة بصيغة «العنوان: القيمة».",
    secMerch: "التصنيف والظهور",
    sort: "ترتيب العرض",
    secSeo: "تحسين محركات البحث والإعدادات المتقدمة",
    seoTitle: "عنوان SEO",
    seoDesc: "وصف SEO",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    close: "إغلاق",
    others: "منتجات أخرى",
    othersDesc: "يُفترض وجود منتج رئيسي واحد. هذه سجلات إضافية موجودة مسبقًا؛ راجعها قبل الإطلاق.",
    cols: ["المنتج", "الرابط", "الخيارات", "الحالة", ""],
    open: "فتح",
  },
  en: {
    title: "Main product",
    desc: "The store sells one product family; colors and sizes are variants of this product, not separate products.",
    edit: "Edit product",
    create: "Create main product",
    emptyTitle: "The main product has not been created",
    emptyBody: "Create the product (name and description), then add colors, sizes, prices and stock.",
    viewStore: "View in store",
    status: "Status",
    active: "Visible in store",
    hidden: "Hidden",
    featured: "Featured on home page",
    variants: "Variants",
    variantsOf: (a: number, n: number) => `${a} active of ${n}`,
    price: "Retail price",
    stock: "Available stock",
    stockOf: (u: number, o: number) => (o ? `${u} units · ${o} out of stock` : `${u} units`),
    manageVariants: "Manage variants",
    managePricing: "Manage pricing",
    manageStock: "Manage stock",
    description: "Description",
    noDescription: "No description yet.",
    specs: "Specifications",
    taxonomy: "Merchandising",
    categories: "Categories",
    brands: "Brands",
    collections: "Collections",
    none: "None",
    media: "Images & video",
    mediaDesc: "Upload files to the approved storage (e.g. R2) and paste the URL here. Files are never stored in the deploy folder.",
    noMedia: "No media yet",
    noMediaBody: "Add at least one image per color so the product shows correctly in the store.",
    addMedia: "Add media",
    url: "File URL",
    urlHint: "An https link from the approved storage.",
    alt: "Image description (for screen readers)",
    color: "Color",
    allColors: "All colors",
    kind: "Type",
    image: "Image",
    video: "Video",
    order: "Display order",
    add: "Add",
    del: "Delete",
    delTitle: "Delete this media?",
    delBody: "It will be removed from the product page. The file itself stays in storage.",
    delConfirm: "Delete",
    secBasics: "Basics",
    name: "Arabic name",
    nameEn: "English name",
    slug: "URL slug",
    slugHint: "Used in the product page URL. Changing it changes the URL.",
    secContent: "Description & specifications",
    specsHint: "One specification per line as “Label: value”.",
    secMerch: "Merchandising & visibility",
    sort: "Display order",
    secSeo: "SEO & advanced settings",
    seoTitle: "SEO title",
    seoDesc: "SEO description",
    save: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    others: "Other products",
    othersDesc: "One main product is expected. These are additional existing records; review them before launch.",
    cols: ["Product", "Slug", "Variants", "Status", ""],
    open: "Open",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

export default async function Products({ searchParams }: { searchParams: Promise<{ edit?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const [list, cats, brs, cols, colors, commerce] = await Promise.all([listProductsAdmin(), listTaxonomyAdmin("categories"), listTaxonomyAdmin("brands"), listTaxonomyAdmin("collections"), listColors(), getSetting("commerce")]);
  const colorName = (c: { name: string; nameEn: string | null }) => (locale === "en" && c.nameEn) || c.name;
  const mainId = (sp.edit && list.some((x) => x.id === sp.edit) ? sp.edit : (list.find((x) => x.active) ?? list[0])?.id) ?? null;
  const p = mainId ? await getProductAdmin(mainId) : null;

  const productForm = (
    <form action={saveProductAction} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <FormSection title={t.secBasics}>
        <Field label={t.name} required><input name="name" required dir="auto" defaultValue={p?.name} className={inputCls} /></Field>
        <Field label={t.nameEn}><input name="nameEn" dir="ltr" defaultValue={p?.nameEn ?? ""} className={inputCls} /></Field>
        <Field label={t.slug} required hint={t.slugHint} className="sm:col-span-2"><input name="slug" required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={p?.slug} className={cn(inputCls, "font-mono")} /></Field>
      </FormSection>
      <FormSection title={t.secContent} cols={1}>
        <Field label={t.description}><textarea name="description" dir="auto" rows={5} defaultValue={p?.description} className={cn(inputCls, "py-2")} /></Field>
        <Field label={t.specs} hint={t.specsHint}><textarea name="specs" dir="auto" rows={4} defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} className={cn(inputCls, "py-2 font-mono text-[13px]")} /></Field>
      </FormSection>
      <FormSection title={t.secMerch} cols={1}>
        <Chips name="categoryIds" legend={t.categories} items={cats} selected={p?.categoryIds ?? []} none={t.none} />
        <Chips name="brandIds" legend={t.brands} items={brs} selected={p?.brandIds ?? []} none={t.none} />
        <Chips name="collectionIds" legend={t.collections} items={cols} selected={p?.collectionIds ?? []} none={t.none} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckRow name="active" label={t.active} defaultChecked={p?.active ?? true} />
          <CheckRow name="featured" label={t.featured} defaultChecked={p?.featured} />
        </div>
      </FormSection>
      <details className="group rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">{t.secSeo}</summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-3 sm:grid-cols-2">
          <Field label={t.seoTitle} hint="≤ 70"><input name="seoTitle" dir="auto" maxLength={70} defaultValue={p?.seoTitle ?? ""} className={inputCls} /></Field>
          <Field label={t.sort}><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={inputCls} /></Field>
          <Field label={t.seoDesc} hint="≤ 170" className="sm:col-span-2"><textarea name="seoDescription" dir="auto" rows={2} maxLength={170} defaultValue={p?.seoDescription ?? ""} className={cn(inputCls, "py-2")} /></Field>
        </div>
      </details>
      <OverlayFooter cancelLabel={t.cancel}>
        <SubmitButton className={btnCls} pendingLabel={t.saving}>{p ? t.save : t.create}</SubmitButton>
      </OverlayFooter>
    </form>
  );
  const editButton = (
    <Overlay trigger={<><Pencil className="size-4" aria-hidden /> {p ? t.edit : t.create}</>} triggerClassName={btnCls} title={p ? t.edit : t.create} closeLabel={t.close}>
      {productForm}
    </Overlay>
  );

  if (!p) {
    return (
      <>
        <AdminPageHeader title={t.title} description={t.desc} />
        <Flash sp={sp} />
        <EmptyState title={t.emptyTitle} action={editButton}>{t.emptyBody}</EmptyState>
      </>
    );
  }

  const variants = await listVariantsAdmin(p.id);
  const prices = variants.filter((v) => v.active).map((v) => v.retailPriceHalalas);
  const units = variants.reduce((n, v) => n + Math.max(0, (v.onHand ?? 0) - (v.reserved ?? 0)), 0);
  const outN = variants.filter((v) => v.active && (v.onHand ?? 0) - (v.reserved ?? 0) <= 0).length;
  const priceText = prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatSAR(prices[0]!, locale) : `${formatSAR(Math.min(...prices), locale)} – ${formatSAR(Math.max(...prices), locale)}`) : "—";
  const others = list.filter((x) => x.id !== p.id);
  const names = (ids: string[], all: { id: string; name: string }[]) => all.filter((x) => ids.includes(x.id)).map((x) => x.name).join("، ") || t.none;

  const summary = [
    { label: t.variants, value: t.variantsOf(variants.filter((v) => v.active).length, variants.length), href: "/admin/variants", link: t.manageVariants, icon: Palette },
    { label: t.price, value: priceText, href: "/admin/pricing", link: t.managePricing, icon: Tags },
    { label: t.stock, value: t.stockOf(units, outN), href: "/admin/inventory", link: t.manageStock, icon: Boxes, warn: outN > 0 || units <= commerce.lowStockThreshold },
  ];

  return (
    <>
      <AdminPageHeader
        title={t.title}
        description={t.desc}
        primary={editButton}
        secondary={
          <Link href={`/products/${p.slug}`} target="_blank" className={btnOutlineCls}>
            <ExternalLink className="size-4" aria-hidden /> {t.viewStore}
          </Link>
        }
      />
      <Flash sp={sp} />

      <section className="mb-5 rounded-lg border border-border bg-card p-5" aria-labelledby="p-name">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="p-name" className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {(locale === "en" && p.nameEn) || p.name}
              {p.featured && <Star className="size-4 fill-warning text-warning" aria-label={t.featured} />}
            </h2>
            <p className="font-mono text-xs text-muted-foreground" dir="ltr">/products/{p.slug}</p>
          </div>
          <StatusBadge tone={p.active ? "success" : "neutral"}>{p.active ? t.active : t.hidden}</StatusBadge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          {summary.map((s) => (
            <div key={s.label} className="bg-card p-4">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="size-4" aria-hidden /> {s.label}</dt>
              <dd className={cn("tabular mt-1 font-semibold", s.warn && "text-warning")}>{s.value}</dd>
              <dd className="mt-2"><Link href={s.href} className="text-sm font-medium text-primary hover:underline">{s.link}</Link></dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Section title={t.description}>
            {p.description ? <p className="whitespace-pre-line text-sm leading-7">{p.description}</p> : <p className="text-sm text-muted-foreground">{t.noDescription}</p>}
            {p.specs.length > 0 && (
              <dl className="mt-4 divide-y divide-border rounded-md border border-border text-sm">
                {p.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-2">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>

          <Section
            title={t.media}
            actions={
              <Overlay trigger={<><ImagePlus className="size-4" aria-hidden /> {t.addMedia}</>} triggerClassName={cn(btnOutlineCls, "min-h-9")} title={t.addMedia} description={t.mediaDesc} closeLabel={t.close}>
                <form action={addMediaAction} className="space-y-5">
                  <input type="hidden" name="productId" value={p.id} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={t.url} required hint={t.urlHint} className="sm:col-span-2"><input name="url" type="url" required pattern="https://.+" placeholder="https://…" dir="ltr" className={inputCls} /></Field>
                    <Field label={t.alt} required className="sm:col-span-2"><input name="alt" dir="auto" required className={inputCls} /></Field>
                    <Field label={t.color}>
                      <select name="colorId" className={inputCls}>
                        <option value="">{t.allColors}</option>
                        {colors.map((c) => <option key={c.id} value={c.id}>{colorName(c)}</option>)}
                      </select>
                    </Field>
                    <Field label={t.kind}>
                      <select name="kind" className={inputCls}>
                        <option value="IMAGE">{t.image}</option>
                        <option value="VIDEO">{t.video}</option>
                      </select>
                    </Field>
                    <Field label={t.order}><input name="sortOrder" type="number" defaultValue={p.media.length} className={inputCls} /></Field>
                  </div>
                  <OverlayFooter cancelLabel={t.cancel}>
                    <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.add}</SubmitButton>
                  </OverlayFooter>
                </form>
              </Overlay>
            }
          >
            {p.media.length === 0 ? (
              <EmptyState icon={ImagePlus} title={t.noMedia} className="border-0 py-8">{t.noMediaBody}</EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {p.media.map((m) => {
                  const c = colors.find((x) => x.id === m.colorId);
                  return (
                    <li key={m.id} className="overflow-hidden rounded-md border border-border">
                      <div className="grid aspect-square place-items-center bg-surface-muted">
                        {m.kind === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary external URL
                          <img src={m.url} alt={m.alt} loading="lazy" className="size-full object-cover" />
                        ) : (
                          <Film className="size-8 text-muted-foreground" aria-label={t.video} />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                        <span className="min-w-0 truncate text-xs text-muted-foreground" title={m.alt}>{c ? colorName(c) : t.allColors}</span>
                        <Overlay kind="modal" trigger={<Trash2 className="size-4" aria-hidden />} triggerClassName={cn(iconBtnCls, "size-8 hover:bg-destructive-soft hover:text-destructive")} triggerLabel={`${t.del} — ${m.alt}`} title={t.delTitle} closeLabel={t.close}>
                          <form action={deleteMediaAction}>
                            <input type="hidden" name="mediaId" value={m.id} />
                            <input type="hidden" name="productId" value={p.id} />
                            <p className="text-sm">{t.delBody}</p>
                            <OverlayFooter cancelLabel={t.cancel}>
                              <SubmitButton className={btnDangerCls} pendingLabel={t.saving}>{t.delConfirm}</SubmitButton>
                            </OverlayFooter>
                          </form>
                        </Overlay>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <Section title={t.taxonomy} className="h-fit">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">{t.categories}</dt><dd>{names(p.categoryIds, cats)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t.brands}</dt><dd>{names(p.brandIds, brs)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t.collections}</dt><dd>{names(p.collectionIds, cols)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t.seoTitle}</dt><dd className="break-words">{p.seoTitle || t.none}</dd></div>
          </dl>
        </Section>
      </div>

      {others.length > 0 && (
        <section className="mt-8" aria-labelledby="others-h">
          <h2 id="others-h" className="text-base font-semibold">{t.others}</h2>
          <Callout tone="warning" className="mb-3 mt-2">{t.othersDesc}</Callout>
          <Table head={t.cols} caption={t.others}>
            {others.map((x) => (
              <tr key={x.id}>
                <td className="font-medium">{x.name}</td>
                <td dir="ltr" className="font-mono text-xs text-muted-foreground">{x.slug}</td>
                <td className="tabular">{x.variants}</td>
                <td><StatusBadge tone={x.active ? "success" : "neutral"}>{x.active ? t.active : t.hidden}</StatusBadge></td>
                <td className="w-px text-end"><Link href={`?edit=${x.id}`} className={cn(btnOutlineCls, "min-h-9 px-3")}>{t.open}</Link></td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}

function Chips({ name, legend, items, selected, none }: { name: string; legend: string; items: { id: string; name: string }[]; selected: string[]; none: string }) {
  return (
    <fieldset className="text-sm">
      <legend className="mb-1.5 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((i) => (
            <label key={i.id} className="cursor-pointer">
              <input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} className="peer sr-only" />
              <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-sm transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40">
                {i.name}
              </span>
            </label>
          ))
        ) : (
          <span className="text-muted-foreground">{none}</span>
        )}
      </div>
    </fieldset>
  );
}
