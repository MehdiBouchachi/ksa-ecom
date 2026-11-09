import { formatSAR } from "@saudi-ecom/contracts";
import { btnCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listTiers, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { addTierAction, deactivateTierAction } from "../actions";

export const metadata = { title: "أسعار الجملة" };

export default async function Pricing({ searchParams }: { searchParams: Promise<{ variantId?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const variants = await listVariantsAdmin();
  const variantId = sp.variantId && variants.some((v) => v.id === sp.variantId) ? sp.variantId : undefined;
  const tiers = await listTiers(variantId);
  return (
    <>
      <PageTitle>شرائح الأسعار (الحد الأدنى للجملة = أصغر شريحة جملة)</PageTitle>
      <Flash sp={sp} />
      <p className="mb-4 text-sm text-muted-foreground">تُقيَّم الشرائح لكل خيار (لون + مقاس) بشكل مستقل. لا يُسمح بتداخل الشرائح. الأسعار يحددها التاجر — لا توجد قيم افتراضية.</p>
      <form method="get" className="mb-4 flex gap-2">
        <label className="sr-only" htmlFor="vsel">الخيار</label>
        <select id="vsel" name="variantId" defaultValue={variantId ?? ""} className={inputCls + " max-w-md"}>
          <option value="">كل الشرائح النشطة</option>
          {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.colorName} / {v.sizeName}</option>)}
        </select>
        <button className={btnCls}>عرض</button>
      </form>
      {variantId && (
        <form action={addTierAction} className="mb-6 grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-5">
          <input type="hidden" name="variantId" value={variantId} />
          <Field label="النوع"><select name="mode" className={inputCls}><option value="BULK">جملة</option><option value="RETAIL">تجزئة (خصم كمية)</option></select></Field>
          <Field label="من كمية"><input name="minQty" type="number" min={1} required className={inputCls} /></Field>
          <Field label="إلى كمية (فارغ = بلا حد)"><input name="maxQty" type="number" min={1} className={inputCls} /></Field>
          <Field label="سعر القطعة (ر.س)"><input name="unitPrice" required inputMode="decimal" dir="ltr" className={inputCls} /></Field>
          <div className="flex items-end"><button className={btnCls}>إضافة شريحة</button></div>
        </form>
      )}
      <Table head={["SKU", "النوع", "الكمية", "سعر القطعة", "الحالة", ""]} empty={!tiers.length}>
        {tiers.map((t) => (
          <tr key={t.id}>
            <td className="font-mono" dir="ltr">{t.sku}</td>
            <td>{t.mode === "BULK" ? "جملة" : "تجزئة"}</td>
            <td>{t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}</td>
            <td>{formatSAR(t.unitPriceHalalas)}</td>
            <td>{t.active ? "نشطة" : "موقوفة"}</td>
            <td>{t.active && (
              <form action={deactivateTierAction}><input type="hidden" name="tierId" value={t.id} /><input type="hidden" name="variantId" value={t.variantId} /><button className="text-destructive">إيقاف</button></form>
            )}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
