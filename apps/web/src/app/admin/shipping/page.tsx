import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import type { ShipmentStatus } from "@saudi-ecom/contracts";
import { btnCls, btnOutlineCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { shipmentStatusLabel } from "@/i18n/ar";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { listShipments, listShippableOrders } from "@/server/shipping/service";
import { createShipmentAction, refreshShipmentAction, saveOperationalSettingsAction } from "../actions";

export const metadata = { title: "الشحن" };

export default async function Shipping({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const [ready, shipments, commerce] = await Promise.all([listShippableOrders(), listShipments(), getSetting("commerce")]);
  const sar = (h: number | null) => (h === null ? "" : (h / 100).toFixed(2));
  return (
    <>
      <PageTitle>الشحن (أرامكس)</PageTitle>
      <Flash sp={await searchParams} />
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 font-bold">جدول الشحن</h2>
        <p className="mb-3 text-xs text-muted-foreground">يحدده التاجر. إذا لم يُحدد سعر الشحن يتوقف إتمام الطلب برسالة واضحة (لا توجد أسعار مخترعة).</p>
        <form action={saveOperationalSettingsAction} className="grid gap-2 sm:grid-cols-4">
          <Field label="سعر الشحن الثابت (ر.س)"><input name="shippingFlat" inputMode="decimal" dir="ltr" defaultValue={sar(commerce.shippingFlatHalalas)} className={inputCls} /></Field>
          <Field label="شحن مجاني من (ر.س، اختياري)"><input name="freeThreshold" inputMode="decimal" dir="ltr" defaultValue={sar(commerce.freeShippingThresholdHalalas)} className={inputCls} /></Field>
          <Field label="حد تنبيه المخزون"><input name="lowStockThreshold" type="number" min={0} defaultValue={commerce.lowStockThreshold} className={inputCls} /></Field>
          <div className="flex items-end"><button className={btnCls}>حفظ</button></div>
        </form>
      </section>
      <h2 className="mb-2 text-lg font-bold">طلبات مدفوعة جاهزة للشحن</h2>
      <Table head={["الطلب", "المدينة", "التاريخ", ""]} empty={!ready.length}>
        {ready.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-primary" dir="ltr">{o.reference}</Link></td>
            <td>{o.city}</td>
            <td>{formatDate(o.createdAt)}</td>
            <td>
              <form action={createShipmentAction}>
                <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value="/admin/shipping" />
                <button className={btnCls}>إنشاء بوليصة</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-2 mt-8 text-lg font-bold">الشحنات</h2>
      <Table head={["الطلب", "AWB", "الحالة", "آخر مزامنة", ""]} empty={!shipments.length}>
        {shipments.map((s) => (
          <tr key={s.id}>
            <td><Link href={`/admin/orders/${s.orderId}`} className="font-mono text-primary" dir="ltr">{s.reference}</Link></td>
            <td className="font-mono" dir="ltr">{s.awb ?? (s.createState === "ERROR" ? "خطأ" : "…")}</td>
            <td>{shipmentStatusLabel[s.status as ShipmentStatus]}{s.lastError ? <span className="block text-xs text-destructive">{s.lastError}</span> : null}</td>
            <td>{(s.lastSyncedAt ? formatDate(s.lastSyncedAt, true) : "—")}</td>
            <td>{s.awb && (
              <form action={refreshShipmentAction}><input type="hidden" name="shipmentId" value={s.id} /><input type="hidden" name="back" value="/admin/shipping" /><button className={btnOutlineCls}>تحديث</button></form>
            )}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
