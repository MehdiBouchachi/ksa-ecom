import Link from "next/link";
import { btnCls, btnOutlineCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { getProductAdmin, listColors, listProductsAdmin, listTaxonomyAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { addMediaAction, deleteMediaAction, saveProductAction } from "../actions";

export const metadata = { title: "المنتجات" };

export default async function Products({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const [list, cats, brs, cols, colors] = await Promise.all([listProductsAdmin(), listTaxonomyAdmin("categories"), listTaxonomyAdmin("brands"), listTaxonomyAdmin("collections"), listColors()]);
  const editing = sp.edit && /^[0-9a-f-]{36}$/i.test(sp.edit) ? await getProductAdmin(sp.edit) : null;
  const showForm = !!editing || sp.new === "1";
  const p = editing;
  const multi = (name: string, items: { id: string; name: string }[], selected: string[]) => (
    <fieldset className="text-sm">
      <legend className="mb-1 font-medium">{name === "categoryIds" ? "التصنيفات" : name === "brandIds" ? "العلامات" : "المجموعات"}</legend>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((i) => (
          <label key={i.id} className="flex items-center gap-1 rounded border border-border px-2 py-1"><input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} /> {i.name}</label>
        )) : <span className="text-muted-foreground">لا يوجد — أضفها أولًا</span>}
      </div>
    </fieldset>
  );
  return (
    <>
      <PageTitle actions={<Link href="?new=1" className={btnCls + " inline-flex items-center"}>منتج جديد</Link>}>المنتجات</PageTitle>
      <Flash sp={sp} />
      {showForm && (
        <form action={saveProductAction} className="mb-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          {p && <input type="hidden" name="id" value={p.id} />}
          <Field label="الاسم"><input name="name" required defaultValue={p?.name} className={inputCls} /></Field>
          <Field label="الرابط (slug)"><input name="slug" required defaultValue={p?.slug} dir="ltr" className={inputCls} /></Field>
          <Field label="الاسم بالإنجليزية"><input name="nameEn" defaultValue={p?.nameEn ?? ""} dir="ltr" className={inputCls} /></Field>
          <Field label="ترتيب العرض"><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={inputCls} /></Field>
          <Field label="الوصف" className="sm:col-span-2"><textarea name="description" rows={4} defaultValue={p?.description} className={inputCls + " py-2"} /></Field>
          <Field label="المواصفات (سطر لكل مواصفة: العنوان: القيمة)" className="sm:col-span-2"><textarea name="specs" rows={4} defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} className={inputCls + " py-2"} /></Field>
          <Field label="عنوان SEO (≤70)"><input name="seoTitle" maxLength={70} defaultValue={p?.seoTitle ?? ""} className={inputCls} /></Field>
          <Field label="وصف SEO (≤170)"><input name="seoDescription" maxLength={170} defaultValue={p?.seoDescription ?? ""} className={inputCls} /></Field>
          <div className="space-y-2 sm:col-span-2">
            {multi("categoryIds", cats, p?.categoryIds ?? [])}
            {multi("brandIds", brs, p?.brandIds ?? [])}
            {multi("collectionIds", cols, p?.collectionIds ?? [])}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured} /> مميز</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> نشط</label>
          <div className="flex gap-2 sm:col-span-2"><button className={btnCls}>حفظ</button><Link href="/admin/products" className={btnOutlineCls + " inline-flex items-center"}>إغلاق</Link></div>
        </form>
      )}
      {p && (
        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">الصور والفيديو</h2>
          <p className="mb-3 text-xs text-muted-foreground">ارفع الملفات إلى التخزين المعتمد (مثل R2) ثم ألصق الرابط هنا. لا تُحفظ الملفات داخل مجلد النشر في Hostinger.</p>
          <ul className="mb-3 space-y-1 text-sm">
            {p.media.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="truncate" dir="ltr">{m.url}</span> · {m.alt}
                <form action={deleteMediaAction}><input type="hidden" name="mediaId" value={m.id} /><input type="hidden" name="productId" value={p.id} /><button className="text-destructive">حذف</button></form>
              </li>
            ))}
          </ul>
          <form action={addMediaAction} className="grid gap-2 sm:grid-cols-6">
            <input type="hidden" name="productId" value={p.id} />
            <input name="url" required placeholder="https://…" dir="ltr" className={inputCls + " sm:col-span-2"} aria-label="رابط الملف" />
            <input name="alt" required placeholder="نص بديل وصفي" className={inputCls} aria-label="النص البديل" />
            <select name="colorId" className={inputCls} aria-label="اللون"><option value="">كل الألوان</option>{colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select name="kind" className={inputCls} aria-label="النوع"><option value="IMAGE">صورة</option><option value="VIDEO">فيديو</option></select>
            <button className={btnCls}>إضافة</button>
          </form>
        </section>
      )}
      <Table head={["المنتج", "الرابط", "الخيارات", "الحالة", ""]} empty={!list.length}>
        {list.map((x) => (
          <tr key={x.id}>
            <td>{x.name}{x.featured ? " ★" : ""}</td>
            <td dir="ltr" className="font-mono">{x.slug}</td>
            <td>{x.variants}</td>
            <td>{x.active ? "نشط" : "موقوف"}</td>
            <td><Link href={`?edit=${x.id}`} className="text-primary">تعديل</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
