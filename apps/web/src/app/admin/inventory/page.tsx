import { formatDate } from "@saudi-ecom/contracts";
import { btnCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listAdjustments, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { adjustStockAction } from "../actions";

export const metadata = { title: "المخزون" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const [variants, ledger] = await Promise.all([listVariantsAdmin(), listAdjustments(undefined, 50)]);
  return (
    <>
      <PageTitle>المخزون</PageTitle>
      <Flash sp={await searchParams} />
      <form action={adjustStockAction} className="mb-6 grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <Field label="الخيار"><select name="variantId" required className={inputCls}>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.colorName} / {v.sizeName}</option>)}</select></Field>
        <Field label="التغيير (+ إضافة / − خصم)"><input name="delta" type="number" required className={inputCls} /></Field>
        <Field label="السبب (إلزامي)"><input name="reason" required minLength={3} className={inputCls} /></Field>
        <div className="flex items-end"><button className={btnCls}>تسجيل التعديل</button></div>
      </form>
      <p className="mb-2 text-xs text-muted-foreground">لا يمكن خفض المخزون تحت الكمية المحجوزة لطلبات قيد الدفع. كل تعديل يُسجَّل باسمك في سجل غير قابل للتعديل.</p>
      <Table head={["SKU", "اللون / المقاس", "في المستودع", "محجوز", "متاح"]} empty={!variants.length}>
        {variants.map((v) => {
          const avail = (v.onHand ?? 0) - (v.reserved ?? 0);
          return (
            <tr key={v.id}>
              <td className="font-mono" dir="ltr">{v.sku}</td>
              <td>{v.colorName} / {v.sizeName}</td>
              <td>{v.onHand ?? 0}</td>
              <td>{v.reserved ?? 0}</td>
              <td className={avail === 0 ? "font-bold text-destructive" : ""}>{avail}</td>
            </tr>
          );
        })}
      </Table>
      <h2 className="mb-2 mt-8 text-lg font-bold">سجل الحركات</h2>
      <Table head={["التاريخ", "SKU", "التغيير", "النوع", "السبب", "بعد", "بواسطة"]} empty={!ledger.length}>
        {ledger.map((l) => (
          <tr key={l.id}>
            <td>{formatDate(l.createdAt, true)}</td>
            <td className="font-mono" dir="ltr">{l.sku}</td>
            <td dir="ltr" className={l.delta < 0 ? "text-destructive" : "text-success"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
            <td>{l.kind}</td>
            <td>{l.reason}</td>
            <td>{l.onHandAfter}</td>
            <td>{l.actor ?? "النظام"}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
