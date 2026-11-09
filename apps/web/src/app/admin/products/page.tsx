import Link from "next/link";
import { ImagePlus, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { btnCls, btnOutlineCls, Field, Flash, inputCls, PageTitle, Section, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { getProductAdmin, listColors, listProductsAdmin, listTaxonomyAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { addMediaAction, deleteMediaAction, saveProductAction } from "../actions";

const T = {
  ar: {
    title: "المنتجات",
    count: (n: number) => `${n} منتج`,
    new: "منتج جديد",
    editTitle: "تعديل المنتج",
    newTitle: "منتج جديد",
    name: "الاسم",
    slug: "الرابط (slug)",
    nameEn: "الاسم بالإنجليزية",
    sort: "ترتيب العرض",
    description: "الوصف",
    specs: "المواصفات",
    specsHint: "سطر لكل مواصفة — العنوان: القيمة",
    seoTitle: "عنوان SEO",
    seoDesc: "وصف SEO",
    categories: "التصنيفات",
    brands: "العلامات",
    collections: "المجموعات",
    none: "لا يوجد — أضفها أولًا",
    featured: "منتج مميز",
    active: "نشط (ظاهر في المتجر)",
    save: "حفظ",
    close: "إغلاق",
    media: "الصور والفيديو",
    mediaHint: "ارفع الملفات إلى التخزين المعتمد (مثل R2) ثم ألصق الرابط هنا. لا تُحفظ الملفات داخل مجلد النشر.",
    noMedia: "لا توجد وسائط بعد.",
    url: "رابط الملف",
    alt: "نص بديل وصفي",
    allColors: "كل الألوان",
    color: "اللون",
    kind: "النوع",
    image: "صورة",
    video: "فيديو",
    add: "إضافة",
    del: "حذف",
    cols: ["المنتج", "الرابط", "الخيارات", "الحالة", ""],
    on: "نشط",
    off: "موقوف",
    edit: "تعديل",
    empty: "لا توجد منتجات بعد",
  },
  en: {
    title: "Products",
    count: (n: number) => `${n} product${n === 1 ? "" : "s"}`,
    new: "New product",
    editTitle: "Edit product",
    newTitle: "New product",
    name: "Name (Arabic)",
    slug: "Slug",
    nameEn: "Name (English)",
    sort: "Sort order",
    description: "Description",
    specs: "Specifications",
    specsHint: "One per line — Label: Value",
    seoTitle: "SEO title",
    seoDesc: "SEO description",
    categories: "Categories",
    brands: "Brands",
    collections: "Collections",
    none: "None yet — add some first",
    featured: "Featured product",
    active: "Active (visible in store)",
    save: "Save",
    close: "Close",
    media: "Images & video",
    mediaHint: "Upload files to the approved storage (e.g. R2) and paste the URL here. Files are never stored in the deploy folder.",
    noMedia: "No media yet.",
    url: "File URL",
    alt: "Descriptive alt text",
    allColors: "All colors",
    color: "Color",
    kind: "Type",
    image: "Image",
    video: "Video",
    add: "Add",
    del: "Delete",
    cols: ["Product", "Slug", "Variants", "Status", ""],
    on: "Active",
    off: "Paused",
    edit: "Edit",
    empty: "No products yet",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

export default async function Products({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const [list, cats, brs, cols, colors] = await Promise.all([listProductsAdmin(), listTaxonomyAdmin("categories"), listTaxonomyAdmin("brands"), listTaxonomyAdmin("collections"), listColors()]);
  const editing = sp.edit && /^[0-9a-f-]{36}$/i.test(sp.edit) ? await getProductAdmin(sp.edit) : null;
  const showForm = !!editing || sp.new === "1";
  const p = editing;

  const multi = (name: string, legend: string, items: { id: string; name: string }[], selected: string[]) => (
    <fieldset className="text-sm">
      <legend className="mb-1.5 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((i) => (
            <label key={i.id} className="cursor-pointer">
              <input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} className="peer sr-only" />
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm transition-colors peer-checked:border-primary peer-checked:bg-accent peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 hover:bg-muted">
                {i.name}
              </span>
            </label>
          ))
        ) : (
          <span className="text-muted-foreground">{t.none}</span>
        )}
      </div>
    </fieldset>
  );
  const toggle = (name: string, label: string, checked: boolean | undefined) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-primary" /> {label}
    </label>
  );

  return (
    <>
      <PageTitle
        description={t.count(list.length)}
        actions={
          !showForm && (
            <Link href="?new=1" className={btnCls}>
              <Plus className="size-4" aria-hidden /> {t.new}
            </Link>
          )
        }
      >
        {t.title}
      </PageTitle>
      <Flash sp={sp} />

      {showForm && (
        <Section
          className="fade-in mb-6"
          title={p ? `${t.editTitle} — ${p.name}` : t.newTitle}
          actions={
            <Link href="/admin/products" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t.close}>
              <X className="size-4" />
            </Link>
          }
        >
          <form action={saveProductAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {p && <input type="hidden" name="id" value={p.id} />}
            <Field label={t.name}><input name="name" required dir="auto" defaultValue={p?.name} className={inputCls} /></Field>
            <Field label={t.nameEn}><input name="nameEn" defaultValue={p?.nameEn ?? ""} dir="ltr" className={inputCls} /></Field>
            <Field label={t.slug}><input name="slug" required defaultValue={p?.slug} dir="ltr" className={inputCls} /></Field>
            <Field label={t.sort}><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={inputCls} /></Field>
            <Field label={t.description} className="sm:col-span-2"><textarea name="description" dir="auto" rows={4} defaultValue={p?.description} className={cn(inputCls, "py-2")} /></Field>
            <Field label={t.specs} hint={t.specsHint} className="sm:col-span-2">
              <textarea name="specs" dir="auto" rows={4} defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} className={cn(inputCls, "py-2")} />
            </Field>
            <Field label={t.seoTitle} hint="≤ 70"><input name="seoTitle" dir="auto" maxLength={70} defaultValue={p?.seoTitle ?? ""} className={inputCls} /></Field>
            <Field label={t.seoDesc} hint="≤ 170"><input name="seoDescription" dir="auto" maxLength={170} defaultValue={p?.seoDescription ?? ""} className={inputCls} /></Field>
            <div className="space-y-4 rounded-xl bg-muted/50 p-4 sm:col-span-2">
              {multi("categoryIds", t.categories, cats, p?.categoryIds ?? [])}
              {multi("brandIds", t.brands, brs, p?.brandIds ?? [])}
              {multi("collectionIds", t.collections, cols, p?.collectionIds ?? [])}
            </div>
            {toggle("featured", t.featured, p?.featured)}
            {toggle("active", t.active, p?.active ?? true)}
            <div className="flex gap-2 border-t border-border pt-4 sm:col-span-2">
              <button className={btnCls}>{t.save}</button>
              <Link href="/admin/products" className={btnOutlineCls}>{t.close}</Link>
            </div>
          </form>
        </Section>
      )}

      {p && (
        <Section
          className="mb-6"
          title={
            <span className="flex items-center gap-2">
              <ImagePlus className="size-4 text-primary" aria-hidden /> {t.media}
            </span>
          }
        >
          <p className="mb-4 text-xs text-muted-foreground">{t.mediaHint}</p>
          {p.media.length ? (
            <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
              {p.media.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs" dir="ltr">{m.url}</span>
                    <span className="block truncate text-muted-foreground">{m.alt}</span>
                  </span>
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="mediaId" value={m.id} />
                    <input type="hidden" name="productId" value={p.id} />
                    <button className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive" aria-label={t.del} title={t.del}>
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">{t.noMedia}</p>
          )}
          <form action={addMediaAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="productId" value={p.id} />
            <input name="url" required placeholder="https://…" dir="ltr" className={cn(inputCls, "lg:col-span-2")} aria-label={t.url} />
            <input name="alt" dir="auto" required placeholder={t.alt} className={inputCls} aria-label={t.alt} />
            <select name="colorId" className={inputCls} aria-label={t.color}>
              <option value="">{t.allColors}</option>
              {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="kind" className={inputCls} aria-label={t.kind}>
              <option value="IMAGE">{t.image}</option>
              <option value="VIDEO">{t.video}</option>
            </select>
            <button className={btnCls}>{t.add}</button>
          </form>
        </Section>
      )}

      <Table head={t.cols} empty={!list.length} emptyText={t.empty}>
        {list.map((x) => (
          <tr key={x.id} className={x.id === p?.id ? "bg-accent/50" : undefined}>
            <td>
              <span className="flex items-center gap-1.5 font-medium">
                {x.name}
                {x.featured && <Star className="size-3.5 fill-amber-400 text-amber-400" aria-label={t.featured} />}
              </span>
            </td>
            <td dir="ltr" className="font-mono text-xs text-muted-foreground">{x.slug}</td>
            <td className="tabular">{x.variants}</td>
            <td>
              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", x.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-stone-50 text-stone-600 ring-stone-200")}>
                <span className={cn("size-1.5 rounded-full", x.active ? "bg-emerald-500" : "bg-stone-400")} aria-hidden />
                {x.active ? t.on : t.off}
              </span>
            </td>
            <td className="text-end">
              <Link href={`?edit=${x.id}`} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent">
                <Pencil className="size-3.5" aria-hidden /> {t.edit}
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
