import Link from "next/link";
import { FolderTree, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/app/admin/actions";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import { AdminPageHeader, btnCls, btnDangerCls, btnGhostCls, btnOutlineCls, CheckRow, EmptyState, Field, FilterBar, Flash, FormSection, iconBtnCls, inputCls, StatusBadge, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTaxonomyAdmin, taxonomyUsage, type TaxonomyTable } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";

const T = {
  ar: {
    titles: { categories: "التصنيفات", brands: "العلامات التجارية", collections: "المجموعات" } as Record<TaxonomyTable, string>,
    descs: {
      categories: "تُستخدم في تصفح المتجر وفلاتره. اربطها بالمنتج من صفحة المنتج الرئيسي.",
      brands: "تظهر في صفحة المنتج وفلاتر المتجر عند الحاجة.",
      collections: "مجموعات عرض موسمية أو تسويقية تظهر كصفحات في المتجر.",
    } as Record<TaxonomyTable, string>,
    singular: { categories: "تصنيف", brands: "علامة", collections: "مجموعة" } as Record<TaxonomyTable, string>,
    add: (k: string) => `إضافة ${k}`,
    editTitle: (n: string) => `تعديل «${n}»`,
    edit: "تعديل",
    search: "بحث",
    searchPh: "الاسم أو الرابط",
    apply: "بحث",
    clear: "مسح",
    secBasics: "الأساسيات",
    name: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    slug: "الرابط (slug)",
    slugHint: "حروف لاتينية صغيرة وأرقام وشرطات.",
    sort: "ترتيب العرض",
    sortHint: "الأصغر يظهر أولًا.",
    active: "نشط (ظاهر في المتجر)",
    secDesc: "الوصف",
    description: "وصف يظهر أعلى صفحة المتجر",
    seo: "تحسين محركات البحث",
    seoTitle: "عنوان SEO",
    seoDesc: "وصف SEO",
    save: "حفظ التغييرات",
    create: "إضافة",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    close: "إغلاق",
    cols: ["الاسم", "الرابط", "الترتيب", "مرتبط بالمنتج", "الحالة", ""],
    linked: "نعم",
    notLinked: "لا",
    on: "نشط",
    off: "موقوف",
    del: "حذف",
    delTitle: (n: string) => `حذف «${n}»؟`,
    delBody: "سيُزال من المتجر ومن ربطه بالمنتج. لا يمكن التراجع.",
    delLinked: "مرتبط حاليًا بالمنتج — سيُلغى الربط.",
    delConfirm: "حذف نهائي",
    empty: "لا يوجد شيء بعد",
    emptyBody: "أضف أول عنصر لتنظيم عرض المنتج في المتجر.",
    noMatch: "لا توجد نتائج مطابقة",
  },
  en: {
    titles: { categories: "Categories", brands: "Brands", collections: "Collections" } as Record<TaxonomyTable, string>,
    descs: {
      categories: "Used for store browsing and filters. Link them to the product on the Main product page.",
      brands: "Shown on the product page and in store filters when relevant.",
      collections: "Seasonal or marketing groupings shown as pages in the store.",
    } as Record<TaxonomyTable, string>,
    singular: { categories: "category", brands: "brand", collections: "collection" } as Record<TaxonomyTable, string>,
    add: (k: string) => `Add ${k}`,
    editTitle: (n: string) => `Edit “${n}”`,
    edit: "Edit",
    search: "Search",
    searchPh: "Name or slug",
    apply: "Search",
    clear: "Clear",
    secBasics: "Basics",
    name: "Arabic name",
    nameEn: "English name",
    slug: "Slug",
    slugHint: "Lowercase Latin letters, digits and dashes.",
    sort: "Display order",
    sortHint: "Lower numbers show first.",
    active: "Active (visible in store)",
    secDesc: "Description",
    description: "Text shown at the top of the store page",
    seo: "SEO",
    seoTitle: "SEO title",
    seoDesc: "SEO description",
    save: "Save changes",
    create: "Add",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    cols: ["Name", "Slug", "Order", "Linked to product", "Status", ""],
    linked: "Yes",
    notLinked: "No",
    on: "Active",
    off: "Paused",
    del: "Delete",
    delTitle: (n: string) => `Delete “${n}”?`,
    delBody: "It will be removed from the store and unlinked from the product. This cannot be undone.",
    delLinked: "Currently linked to the product — the link will be removed.",
    delConfirm: "Delete permanently",
    empty: "Nothing here yet",
    emptyBody: "Add the first item to organise how the product is presented in the store.",
    noMatch: "No matching results",
  },
};

export async function taxonomyTitle(kind: TaxonomyTable) {
  return T[await getLocale()].titles[kind];
}

type Row = Awaited<ReturnType<typeof listTaxonomyAdmin>>[number];

export async function TaxonomyAdmin({ kind, sp }: { kind: TaxonomyTable; sp: { ok?: string; error?: string; q?: string } }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const [rows, usage] = await Promise.all([listTaxonomyAdmin(kind), taxonomyUsage(kind)]);
  const q = sp.q?.trim().toLowerCase();
  const filtered = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || (r.nameEn ?? "").toLowerCase().includes(q) || r.slug.includes(q));
  const back = `/admin/${kind}${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`;

  const form = (e?: Row) => (
    <form action={saveTaxonomyAction} className="space-y-6">
      <input type="hidden" name="kind" value={kind} />
      {e && <input type="hidden" name="id" value={e.id} />}
      <FormSection title={t.secBasics}>
        <Field label={t.name} required><input name="name" required dir="auto" defaultValue={e?.name} className={inputCls} /></Field>
        <Field label={t.nameEn}><input name="nameEn" dir="ltr" defaultValue={e?.nameEn ?? ""} className={inputCls} /></Field>
        <Field label={t.slug} required hint={t.slugHint}><input name="slug" required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={e?.slug} className={cn(inputCls, "font-mono")} /></Field>
        <Field label={t.sort} hint={t.sortHint}><input name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} className={inputCls} /></Field>
        <CheckRow name="active" label={t.active} defaultChecked={e?.active ?? true} className="sm:col-span-2" />
      </FormSection>
      <FormSection title={t.secDesc} cols={1}>
        <Field label={t.description}><textarea name="description" dir="auto" rows={3} defaultValue={e?.description} className={cn(inputCls, "py-2")} /></Field>
      </FormSection>
      <details className="rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">{t.seo}</summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-3">
          <Field label={t.seoTitle} hint="≤ 70"><input name="seoTitle" dir="auto" maxLength={70} defaultValue={e?.seoTitle ?? ""} className={inputCls} /></Field>
          <Field label={t.seoDesc} hint="≤ 170"><textarea name="seoDescription" dir="auto" rows={2} maxLength={170} defaultValue={e?.seoDescription ?? ""} className={cn(inputCls, "py-2")} /></Field>
        </div>
      </details>
      <OverlayFooter cancelLabel={t.cancel}>
        <SubmitButton className={btnCls} pendingLabel={t.saving}>{e ? t.save : t.create}</SubmitButton>
      </OverlayFooter>
    </form>
  );
  const addButton = (
    <Overlay trigger={<><Plus className="size-4" aria-hidden /> {t.add(t.singular[kind])}</>} triggerClassName={btnCls} title={t.add(t.singular[kind])} closeLabel={t.close}>
      {form()}
    </Overlay>
  );

  return (
    <>
      <AdminPageHeader title={t.titles[kind]} description={t.descs[kind]} primary={rows.length > 0 && addButton} />
      <Flash sp={sp} />
      {rows.length === 0 ? (
        <EmptyState icon={FolderTree} title={t.empty} action={addButton}>{t.emptyBody}</EmptyState>
      ) : (
        <>
          {rows.length > 8 && (
            <FilterBar label={t.search}>
              <label className="min-w-0 flex-1 basis-56 sm:max-w-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.search}</span>
                <input type="search" name="q" defaultValue={sp.q} placeholder={t.searchPh} className={inputCls} />
              </label>
              <button className={btnOutlineCls}>{t.apply}</button>
              {sp.q && <Link href={`/admin/${kind}`} className={btnGhostCls}>{t.clear}</Link>}
            </FilterBar>
          )}
          {filtered.length === 0 ? (
            <EmptyState icon={SearchX} title={t.noMatch} />
          ) : (
            <Table head={t.cols} caption={t.titles[kind]}>
              {filtered.map((r) => {
                const used = usage.get(r.id) ?? 0;
                return (
                  <tr key={r.id} className={cn(!r.active && "text-muted-foreground")}>
                    <td>
                      <span className="font-medium">{r.name}</span>
                      {r.nameEn && <span className="block text-xs text-muted-foreground" dir="ltr">{r.nameEn}</span>}
                    </td>
                    <td dir="ltr" className="font-mono text-xs text-muted-foreground">{r.slug}</td>
                    <td className="tabular">{r.sortOrder}</td>
                    <td>{used > 0 ? t.linked : <span className="text-muted-foreground">{t.notLinked}</span>}</td>
                    <td><StatusBadge tone={r.active ? "success" : "neutral"}>{r.active ? t.on : t.off}</StatusBadge></td>
                    <td className="w-px">
                      <div className="flex items-center justify-end gap-0.5">
                        <Overlay trigger={<Pencil className="size-4" aria-hidden />} triggerClassName={iconBtnCls} triggerLabel={`${t.edit} — ${r.name}`} title={t.editTitle(r.name)} closeLabel={t.close}>
                          {form(r)}
                        </Overlay>
                        <Overlay kind="modal" trigger={<Trash2 className="size-4" aria-hidden />} triggerClassName={cn(iconBtnCls, "hover:bg-destructive-soft hover:text-destructive")} triggerLabel={`${t.del} — ${r.name}`} title={t.delTitle(r.name)} closeLabel={t.close}>
                          <form action={deleteTaxonomyAction}>
                            <input type="hidden" name="kind" value={kind} />
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="back" value={back} />
                            <p className="text-sm">{t.delBody}</p>
                            {used > 0 && <p className="mt-2 text-sm text-warning">{t.delLinked}</p>}
                            <OverlayFooter cancelLabel={t.cancel}>
                              <SubmitButton className={btnDangerCls} pendingLabel={t.saving}>{t.delConfirm}</SubmitButton>
                            </OverlayFooter>
                          </form>
                        </Overlay>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </>
      )}
    </>
  );
}
