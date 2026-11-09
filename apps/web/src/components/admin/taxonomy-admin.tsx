import { btnCls, ConfirmBox, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listTaxonomyAdmin, type TaxonomyTable } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/app/admin/actions";

const TITLES: Record<TaxonomyTable, string> = { categories: "التصنيفات", brands: "العلامات التجارية", collections: "المجموعات" };

export async function TaxonomyAdmin({ kind, sp }: { kind: TaxonomyTable; sp: { ok?: string; error?: string; edit?: string } }) {
  await requireStaff();
  const rows = await listTaxonomyAdmin(kind);
  const e = rows.find((r) => r.id === sp.edit);
  return (
    <>
      <PageTitle>{TITLES[kind]}</PageTitle>
      <Flash sp={sp} />
      <form action={saveTaxonomyAction} className="mb-6 grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <input type="hidden" name="kind" value={kind} />
        {e && <input type="hidden" name="id" value={e.id} />}
        <Field label="الاسم"><input name="name" required defaultValue={e?.name} className={inputCls} /></Field>
        <Field label="الرابط (slug)"><input name="slug" required defaultValue={e?.slug} dir="ltr" className={inputCls} /></Field>
        <Field label="الترتيب"><input name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} className={inputCls} /></Field>
        <Field label="الوصف" className="sm:col-span-3"><textarea name="description" rows={3} defaultValue={e?.description} className={inputCls + " py-2"} /></Field>
        <Field label="عنوان SEO"><input name="seoTitle" maxLength={70} defaultValue={e?.seoTitle ?? ""} className={inputCls} /></Field>
        <Field label="وصف SEO"><input name="seoDescription" maxLength={170} defaultValue={e?.seoDescription ?? ""} className={inputCls} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={e?.active ?? true} /> نشط</label>
        <div><button className={btnCls}>{e ? "حفظ التعديل" : "إضافة"}</button></div>
      </form>
      <Table head={["الاسم", "الرابط", "الحالة", "", ""]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td dir="ltr" className="font-mono">{r.slug}</td>
            <td>{r.active ? "نشط" : "موقوف"}</td>
            <td><a href={`?edit=${r.id}`} className="text-primary">تعديل</a></td>
            <td>
              <details>
                <summary className="cursor-pointer text-destructive">حذف</summary>
                <form action={deleteTaxonomyAction} className="mt-2 space-y-2">
                  <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={r.id} />
                  <ConfirmBox label={`حذف "${r.name}"`} />
                  <button className="text-destructive">تأكيد</button>
                </form>
              </details>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
