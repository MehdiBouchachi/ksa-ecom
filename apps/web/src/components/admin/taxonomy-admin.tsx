import Link from "next/link";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { btnCls, btnOutlineCls, CheckRow, ConfirmBox, Field, Flash, inputCls, PageTitle, Section, StatusPill, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTaxonomyAdmin, type TaxonomyTable } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/app/admin/actions";

const T = {
  ar: {
    titles: { categories: "التصنيفات", brands: "العلامات التجارية", collections: "المجموعات" } as Record<TaxonomyTable, string>,
    count: (n: number) => `${n} عنصر`,
    add: "إضافة جديد",
    edit: "تعديل",
    name: "الاسم",
    slug: "الرابط (slug)",
    sort: "الترتيب",
    description: "الوصف",
    seoTitle: "عنوان SEO",
    seoDesc: "وصف SEO",
    active: "نشط",
    save: "حفظ التعديل",
    create: "إضافة",
    cancel: "إلغاء",
    cols: ["الاسم", "الرابط", "الحالة", ""],
    pill: ["نشط", "موقوف"] as [string, string],
    del: "حذف",
    confirmDel: (n: string) => `أؤكد حذف "${n}"`,
    confirm: "تأكيد الحذف",
  },
  en: {
    titles: { categories: "Categories", brands: "Brands", collections: "Collections" } as Record<TaxonomyTable, string>,
    count: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    add: "Add new",
    edit: "Edit",
    name: "Name",
    slug: "Slug",
    sort: "Sort order",
    description: "Description",
    seoTitle: "SEO title",
    seoDesc: "SEO description",
    active: "Active",
    save: "Save changes",
    create: "Add",
    cancel: "Cancel",
    cols: ["Name", "Slug", "Status", ""],
    pill: ["Active", "Paused"] as [string, string],
    del: "Delete",
    confirmDel: (n: string) => `I confirm deleting "${n}"`,
    confirm: "Confirm delete",
  },
};

export async function taxonomyTitle(kind: TaxonomyTable) {
  return T[await getLocale()].titles[kind];
}

export async function TaxonomyAdmin({ kind, sp }: { kind: TaxonomyTable; sp: { ok?: string; error?: string; edit?: string } }) {
  await requireStaff();
  const t = T[await getLocale()];
  const rows = await listTaxonomyAdmin(kind);
  const e = rows.find((r) => r.id === sp.edit);
  return (
    <>
      <PageTitle description={t.count(rows.length)}>{t.titles[kind]}</PageTitle>
      <Flash sp={sp} />
      <Section
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            {e ? <Pencil className="size-4 text-primary" aria-hidden /> : <Plus className="size-4 text-primary" aria-hidden />}
            {e ? `${t.edit} — ${e.name}` : t.add}
          </span>
        }
        actions={
          e && (
            <Link href="?" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t.cancel}>
              <X className="size-4" />
            </Link>
          )
        }
      >
        <form action={saveTaxonomyAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input type="hidden" name="kind" value={kind} />
          {e && <input type="hidden" name="id" value={e.id} />}
          <Field label={t.name}><input name="name" required dir="auto" defaultValue={e?.name} className={inputCls} /></Field>
          <Field label={t.slug}><input name="slug" required defaultValue={e?.slug} dir="ltr" className={inputCls} /></Field>
          <Field label={t.sort}><input name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} className={inputCls} /></Field>
          <Field label={t.description} className="sm:col-span-3"><textarea name="description" dir="auto" rows={3} defaultValue={e?.description} className={cn(inputCls, "py-2")} /></Field>
          <Field label={t.seoTitle} hint="≤ 70"><input name="seoTitle" dir="auto" maxLength={70} defaultValue={e?.seoTitle ?? ""} className={inputCls} /></Field>
          <Field label={t.seoDesc} hint="≤ 170"><input name="seoDescription" dir="auto" maxLength={170} defaultValue={e?.seoDescription ?? ""} className={inputCls} /></Field>
          <div className="sm:pt-[1.625rem]"><CheckRow name="active" label={t.active} defaultChecked={e?.active ?? true} /></div>
          <div className="flex gap-2 border-t border-border pt-4 sm:col-span-3">
            <button className={btnCls}>{e ? t.save : t.create}</button>
            {e && <Link href="?" className={btnOutlineCls}>{t.cancel}</Link>}
          </div>
        </form>
      </Section>
      <Table head={t.cols} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id} className={r.id === e?.id ? "bg-accent/50" : undefined}>
            <td className="font-medium">{r.name}</td>
            <td dir="ltr" className="font-mono text-xs text-muted-foreground">{r.slug}</td>
            <td><StatusPill on={r.active} labels={t.pill} /></td>
            <td>
              <div className="flex items-start justify-end gap-1">
                <Link href={`?edit=${r.id}`} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent">
                  <Pencil className="size-3.5" aria-hidden /> {t.edit}
                </Link>
                <details className="group">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-red-50 [&::-webkit-details-marker]:hidden">
                    <Trash2 className="size-3.5" aria-hidden /> {t.del}
                  </summary>
                  <form action={deleteTaxonomyAction} className="mt-2 w-60 space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-3">
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmBox label={t.confirmDel(r.name)} />
                    <button className="min-h-9 w-full rounded-lg bg-destructive px-3 text-sm font-semibold text-white hover:bg-destructive/90">{t.confirm}</button>
                  </form>
                </details>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
